import os
import json
import random
import string
import threading
import copy
import apsw  # pip install apsw
from typing import Dict, Any

from src.core.Utils.Others.folders import queues_db
from src.core.Utils.Others.LogColor import LogColor

DB_FILE = os.path.abspath(queues_db)

class QueueCore:
    def __init__(self, socket):
        self.SOCKET = socket
        self.lock = threading.RLock()
        # Abre (ou cria) o banco
        self.conn = apsw.Connection(DB_FILE)
        self._init_tables()

        # Cache em memória
        self._cache: Dict[str, Dict[str, Any]] = {"uploads": {}, "downloads": {}}
        self.load_cache()

    def _init_tables(self) -> None:
        """Cria tabelas uploads e downloads se não existirem."""
        cursor = self.conn.cursor()
        for section in ("uploads", "downloads"):
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {section} (
                    id TEXT PRIMARY KEY,
                    manga_id TEXT NOT NULL,
                    data   TEXT NOT NULL
                );
            """)
        cursor.close()

    def clear_section(self, section: str) -> None:
        """Apaga todos os registros de uma seção."""
        with self.lock:
            cursor = self.conn.cursor()
            cursor.execute(f"DELETE FROM {section};")
            cursor.close()
            self._cache[section].clear()
            print(f"{LogColor.INFO}[INFO]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} Seção '{section}' limpa.")

    def reset(self) -> None:
        """Limpa uploads e downloads por completo."""
        with self.lock:
            self.clear_section("uploads")
            self.clear_section("downloads")
            print(f"{LogColor.INFO}[INFO]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} Cache zerado!")

    def save_section(self, section: str, section_data: Dict[str, Any]) -> None:
        """Insere ou atualiza múltiplos registros de uma seção."""
        with self.lock:
            cursor = self.conn.cursor()
            for unique_id, entry in section_data.items():
                manga_id = str(entry["project"]["manga_id"])
                data_txt = json.dumps(entry, ensure_ascii=False)
                cursor.execute(f"""
                    INSERT OR REPLACE INTO {section}(id, manga_id, data)
                    VALUES (?, ?, ?);
                """, (unique_id, manga_id, data_txt))
                print(f"{LogColor.INFO}[INFO]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} Salvo {section}/{unique_id}")
                # Atualiza cache
                self._cache[section][unique_id] = entry
            cursor.close()

    def save(self, queues: Dict[str, Dict[str, Any]]) -> None:
        if "uploads" in queues:
            self.save_section("uploads", queues["uploads"])
        if "downloads" in queues:
            self.save_section("downloads", queues["downloads"])

    def load_section(self, section: str) -> Dict[str, Any]:
        """Carrega todos os registros de uma seção do banco."""
        data: Dict[str, Any] = {}
        cursor = self.conn.cursor()
        for row in cursor.execute(f"SELECT id, data FROM {section};"):
            uid, txt = row
            try:
                data[uid] = json.loads(txt)
            except json.JSONDecodeError as e:
                print(f"{LogColor.ERROR}[ERROR]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} JSON inválido em {section}/{uid}: {e}")
        cursor.close()
        return data

    def load_cache(self) -> Dict[str, Dict[str, Any]]:
        """Atualiza todo o cache interno com o estado do banco."""
        with self.lock:
            for section in ("uploads", "downloads"):
                self._cache[section] = self.load_section(section)
            # Retorna cópia profunda para evitar referências externas
            return copy.deepcopy(self._cache)

    def load(self) -> Dict[str, Dict[str, Any]]:
        with self.lock:
            return copy.deepcopy(self._cache)

    def generate_unique_id(self, length: int = 5) -> str:
        """Gera um ID e garante que não exista em nenhuma seção."""
        with self.lock:
            cursor = self.conn.cursor()
            while True:
                new_id = ''.join(random.choices(string.digits, k=length))
                # checa existência em ambas as tabelas
                exists = False
                for section in ("uploads", "downloads"):
                    for _ in cursor.execute(f"SELECT 1 FROM {section} WHERE id = ?;", (new_id,)):
                        exists = True
                        break
                    if exists:
                        break
                if not exists:
                    cursor.close()
                    return new_id

    def get_by_id(self, unique_id: str) -> Any:
        """Retorna o registro com aquele ID, ou None."""
        with self.lock:
            return self._cache["uploads"].get(unique_id) or self._cache["downloads"].get(unique_id)

    def deep_merge(self, original: dict, updates: dict) -> dict:
        for k, v in updates.items():
            if isinstance(v, dict) and isinstance(original.get(k), dict):
                original[k] = self.deep_merge(original[k], v)
            else:
                original[k] = v
        return original

    def update_field(self, unique_id: str, section: str, updates: dict) -> None:
        """
        Atualiza campos de um único registro, tanto no cache quanto no banco.
        """
        if section not in ("uploads", "downloads"):
            print(f"{LogColor.ERROR}[ERROR]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} Seção inválida.")
            return

        with self.lock:
            entry = self._cache[section].get(unique_id)
            if not entry:
                print(f"{LogColor.WARNING}[WARN]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} ID '{unique_id}' não encontrado.")
                return

            # Mescla os dados
            merged = self.deep_merge(entry, updates)
            # Salva só esse entry
            self.save_section(section, {unique_id: merged})
            print(f"{LogColor.INFO}[INFO]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} '{unique_id}' atualizado em '{section}'.")

    def merge_and_save(self, new_queues: Dict[str, Dict[str, Any]]) -> None:
        """Adiciona novos itens ao cache e ao banco."""
        with self.lock:
            for section in ("uploads", "downloads"):
                if section in new_queues:
                    self._cache[section].update(new_queues[section])
            self.save(new_queues)

    def check_on_login(self) -> bool:
        """
        Se todos os status.value == 1, reseta tudo.
        Caso contrário, emite os pendentes via websocket.
        """
        with self.lock:
            non_reset = {
                sec: {
                    uid: e for uid, e in self._cache[sec].items()
                    if e.get("status", {}).get("value") != 1
                }
                for sec in ("uploads", "downloads")
            }

            if not non_reset["uploads"] and not non_reset["downloads"]:
                self.reset()
                self.SOCKET.emit("check_queue_data")
                return True
            else:
                self.SOCKET.emit("check_on_login_data", non_reset)
                print(f"{LogColor.INFO}[INFO]{LogColor.QUEUE}[QUEUE]{LogColor.RESET} Pendências na fila.")
                return False
