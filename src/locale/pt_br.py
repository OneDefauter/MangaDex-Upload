pt_br = {
    "login": {
        "#comment1": "Rota: /",
        "#comment2": "Página de login",
        "login_title": "Login",
        "username": "Usuário",
        "password": "Senha",
        "client_id": "Cliente ID",
        "client_secret": "Cliente Secreto",
        "login": "Login",
        "tooltip": {
            "client_id": {
                "title": "Como obter o CLIENTE ID?",
                "steps": [
                    "Acesse <a href=\"https://mangadex.org/settings\" target=\"_blank\">MangaDex Settings</a> e faça login.",
                    "Vá para a seção \"API Client\" e siga as instruções.",
                    "Após a aprovação, seu CLIENTE ID aparecerá como: <code>personal-client-...</code>"
                ]
            },
            "client_secret": {
                "title": "Como obter o CLIENTE SECRETO?",
                "steps": [
                    "Após obter o CLIENTE ID, vá até a seção \"API Client\".",
                    "Clique no botão <b>\"Get Secret\"</b> para visualizar sua chave.",
                    "Copie e guarde o CLIENTE SECRETO com segurança."
                ]
            }
        },
        "python": {
            "fill_all_fields": "Por favor, preencha todos os campos.",
            "missing_tokens": "O servidor não retornou os tokens necessários.",
            "unauthorized": "Credenciais inválidas. Por favor, tente novamente.",
            "forbidden": "Acesso negado. Verifique sua conta e permissões.",
            "server_error": "Erro no servidor. Tente novamente mais tarde.",
            "unexpected_error": "Erro inesperado ({status_code}): {text}",
            "timeout": "O servidor demorou muito para responder. Tente novamente mais tarde.",
            "connection_error": "Erro de conexão: {error}"
        }
    },

    "home": {
        "#comment1": "Rota: /home",
        "#comment2": "Página inicial após o login",
        "home_title": "Início",
        "welcome_title": "Bem-vindo ao MangaDex Uploader",
        "options": {
            "settings": "Configurações",
            "queue": "Fila",
            "upload": "Enviar",
            "upload_mult": "Enviar - Multi",
            "download": "Baixar",
            "edit": "Editar",
            "updates": "Atualizações",
            "logs": "Logs de Upload",
            "logout": "Sair",
            "create": "Criar Projeto"
        },
        "python": {
            "welcome_message": "Bem-vindo ao MangaDex Uploader, {username}!",
            "new_update": "Nova atualização disponível! v{version}",
            "up_to_date": "Você está na versão mais recente! v{version}"
        }
    },

    "config": {
        "#comment1": "Rota: /config",
        "#comment2": "Página de configurações",
        "config_title": "Configurações",

        "filter": {
            "all": "Todos",
            "downloads": "Downloads",
            "uploads": "Uploads",
            "covers": "Covers",
            "search": "Pesquisa",
            "storage": "Armazenamento",
            "api": "API",
            "others": "Outros"
        },

        "filter_modal": {
            "search_filter": "Filtro de pesquisa",
            "status": {
                "status": "Status",
                "ongoing": "Em progresso",
                "completed": "Completo",
                "hiatus": "Em hiato",
                "cancelled": "Cancelado"
            },
            "language": {
                "available_translated_language": "Idiomas Disponíveis",
                "pt-br": "Português Brasil (pt-br)",
                "en": "Inglês (en)"
            },
            "demographic": {
                "demographic": "Demografia",
                "shounen": "Shounen",
                "shoujo": "Shoujo",
                "josei": "Josei",
                "seinen": "Seinen"
            },
            "content_rating": {
                "content_rating": "Classificação de Conteúdo",
                "safe": "Livre",
                "suggestive": "Sugestivo",
                "erotica": "Erótico",
                "pornographic": "Pornográfico"
            },
            "order_by": {
                "order": "Ordenar por",
                "title": "Título",
                "year": "Ano",
                "created_at": "Data de Criação",
                "updated_at": "Data de Atualização",
                "latest_uploaded_chapter": "Último Capítulo Enviado",
                "followed_count": "Quantidade de Seguidores",
                "relevance": "Relevância"
            },
            "order": {
                "asc": "Crescente",
                "desc": "Decrescente"
            },
            "apply": "Aplicar"
        },

        "simultaneous_upload": "Download/Upload Simultâneo:",
        "max_results": "Quantidade Máxima de Resultados:",
        "max_results_page": "Quantidade Máxima de Resultados por Página:",
        "search_filter": "Filtro de Pesquisa:",
        "edit_search_filter": "Editar Filtro de Pesquisa",
        "max_retries": "Máximo de Tentativas:",
        "download_folder": "Pasta de Downloads:",
        "scheme": {
            "download_folder_scheme": "Esquema da Pasta de Downloads:",
            "scheme1": "Idioma / Título da obra / Capítulo",
            "scheme2": "Idioma / Título da obra / Volume / Capítulo",
            "scheme3": "Título da obra / Idioma / Volume / Capítulo",
            "scheme4": "Título da obra / Idioma / Capítulo",
            "scheme5": "Título da obra / Volume / Capítulo",
            "scheme6": "Título da obra / Capítulo",
            "scheme7": "Grupo / Título da obra / Capítulo",
            "scheme8": "Grupo / Título da obra / Volume / Capítulo",
            "scheme9": "Idioma / Grupo / Título da obra / Capítulo",
            "scheme10": "Idioma / Grupo / Título da obra / Volume / Capítulo",
            "scheme11": "Grupo / Idioma / Título da obra / Capítulo",
            "scheme12": "Grupo / Idioma / Título da obra / Volume / Capítulo"
        },

        "cover_image": {
            "cover_image_quality": "Imagens das covers:",
            "original": "Original",
            "reduced": "Reduzida",
            "highly_reduced": "Muito reduzida"
        },

        "upload_on_error": "Fazer upload de capítulos com erros nas imagens:",
        "preprocess_images": "Pré-processar imagens antes de colocar na fila:",
        "auto_adapt_cutting_tool": "Adaptar ferramenta de corte automaticamente:",

        "cutting_tool": {
            "cutting_tool": "Ferramenta de corte:",
            "smart_stitch": "SmartStitch",
            "pillow": "Pillow"
        },

        "output_file_type": "Tipo de arquivo de saída:",
        "output_image_quality": "Qualidade da imagem de saída:",
        "queue_operations": "Número de operações simultâneas para fila:",
        "image_operations": "Número de operações simultâneas para imagens:",
        "download_folder_size": "Tamanho ocupado pela pasta de covers:",
        "delete_folder_button": "Excluir Pasta",
        "temp_folders_size": "Tamanho ocupado por pastas temporárias:",
        "delete_temp_folders_button": "Excluir Pastas Temporárias",
        "api_url": "URL da API:",
        "auth_url": "URL de Autenticação:",

        "debug": {
            "debug_mode": "Modo de Depuração:",
            "debug_ui_toggle": "Mostrar UI de Debug:",
            "filter_events": "Filtros de Eventos:",
            "filter_events_button": "Configurar Filtros"
        },

        "save_button": "Salvar",
        "tips_button": "Dicas",
        "restore_defaults_button": "Restaurar Padrões",
        "back_home_link": "Voltar para o Início",

        "modal": {
            "tips": {
                "title": "Dicas",
                "tip": "Dica",
                "seen": "Visto",
                "not_seen": "Não Visto"
            },

            "confirmation": {
                "title": "Confirmação",
                "confirm_button": "Continuar",
                "cancel_button": "Cancelar",
                "changes_detected_message": "Alterações detectadas:",
                "restore_defaults_message": "Você está prestes a restaurar os seguintes valores para o padrão:"
            }
        },

        "info": {
            "auto_adapt_title": "O que é o Auto Adapt Cutting Tool?",
            "auto_adapt_description": "Ao ativar essa opção será usado automaticamente o SmartStitch em obras com a tag Long Strip."
        },

        "friendlynames": {
            "uploads": "Upload Simultâneo",
            "retry": "Máximo de Tentativas",
            "log": "Log de Eventos",
            "api_url": "URL da API",
            "auth_url": "URL de Autenticação",
            "max_results": "Máximo de Resultados",
            "max_results_page": "Máximo de Resultados por Página",
            "download_folder": "Pasta de Downloads",
            "download_folder_scheme": "Esquema da Pasta de Downloads",
            "cover_image_quality": "Qualidade das Imagens de Capa",
            "upload_on_error": "Enviar Capítulos com Erros",
            "preprocess_images": "Pré-processar Imagens",
            "auto_adapt_cutting_tool": "Auto adaptar ferramenta",
            "cutting_tool": "Ferramenta de Corte",
            "output_file_type": "Tipo de Arquivo de Saída",
            "output_image_quality": "Qualidade da Imagem de Saída",
            "queue_operations": "Operações Simultâneas na Fila",
            "image_operations": "Operações Simultâneas nas Imagens",
            "multi_upload_page": "Upload Múltiplo",
            "upload_page": "Upload Simples",
            "loading_animation": "Loading Animation",
            "API_KEY_DETECTLANGUAGE": "API Key Detect Language",
            "create_work_page": "Criar Obra"
        },

        "enabled": "Ativado",
        "disabled": "Desativado",
        "loading": "Overlley",
        "api_key": "Detect Language API",

        "console_and_alert": {
            "alert": {
                "update_tip_status": "Erro ao atualizar o status da dica.",
                "selected_folder": "Pasta selecionada: ",
                "folder_not_selected": "Nenhuma pasta selecionada.",
                "folder_error": "Erro ao selecionar a pasta.",
                "confirm_delete_folder": "Tem certeza que deseja excluir esta pasta?",
                "folder_deleted": "Pasta excluída com sucesso!",
                "folder_delete_error": "Erro ao excluir a pasta.",
                "no_changes_detected": "Nenhuma alteração detectada.",
                "no_restore_changes": "Nenhuma alteração a ser restaurada."
            },
            "console": {
                "update_tip_status": "Erro ao atualizar o status da dica: ",
                "selected_folder": "Erro ao selecionar a pasta: ",
                "delete_folder_error": "Erro ao excluir a pasta: ",
                "delete_temp_folders_error": "Erro ao excluir as pastas temporárias: ",
                "send_filter_save": "Enviando filtro para salvar: ",
                "filter_loaded": "Filtro salvo carregado: "
            }
        }
    },

    "queue": {
        "#comment1": "Rota: /queue",
        "#comment2": "Página de fila de processos",
        "queue_title": "Fila de Processos",
        "downloads": "Downloads",
        "uploads": "Uploads",
        "reverse_button": "Inverter",
        "auto_scroll_button": "Rolar Automaticamente",
        "filter": "Filtrar",
        "download_queue": "Fila de Downloads",
        "upload_queue": "Fila de Uploads",
        "back_button": "Voltar",
        "no_download_items": "Nenhum item na fila de downloads",
        "no_upload_items": "Nenhum item na fila de uploads",
        "error_delete_item": "Erro ao excluir o item.",

        "modal": {
            "filter": {
                "filter_title": "Filtrar itens",
                "projects": "Nome da obra:",
                "status": {
                    "status": "Status:",
                    "waiting": "Aguardando",
                    "processing": "Processando",
                    "completed": "Concluído",
                    "canceled": "Cancelado",
                    "error": "Erro"
                },
                "apply": "Aplicar Filtro"
            }
        },

        "console_and_alert": {
            "alert": {
                "error_delete_item": "Erro ao excluir o item: "
            },
            "console": {
                "delete_item_error": "Erro ao excluir o item: "
            }
        },

        "context_menu": {
            "cancel": "Cancelar",
            "delete": "Excluir",
            "prioritize": "Priorizar",
            "retry": "Reenviar"
        },

        "script": {
            "main": {
                "language": "Idioma:",
                "chapter": "Capítulo:",
                "scan": "Scans:",
                "status": "Status:",
                "detail": "Detalhe:",
                "error": "Erro:",
                "unknow": "Não informado",
                "undefined": "Indefinido"
            }
        }
    },

    "upload": {
        "#comment1": "Rota: /upload",
        "#comment2": "Página de enviar capítulo um por vez",
        "upload_manga": "Enviar Mangá",
        "project": "Projeto:",
        "group": "Grupo:",
        "language": "Linguagem:",
        "portuguese_brazil": "Português (Brasil)",
        "english": "Inglês",
        "title": "Título:",
        "volume": "Volume:",
        "chapter": "Capítulo:",
        "single_chapter": "Capítulo Único:",
        "folder": "Pasta:",
        "file": "Arquivo:",
        "upload_datetime": "Data e Hora de Upload:",
        "submit": "Enviar",

        "folder_selected": "Pasta selecionada",
        "folder_not_selected": "Nenhuma pasta foi selecionada",
        "error_select_folder": "Erro ao selecionar a pasta",
        "file_selected": "Arquivo selecionado",
        "file_not_selected": "Nenhum arquivo foi selecionado",
        "error_select_file": "Erro ao selecionar o arquivo",
        "upload_sended": "Upload enviado para fila",
        "error_send_data": "Erro ao enviar dados",
        "need_required_fields": "Por favor, preencha todos os campos obrigatórios.",

        "modal": {
            "tip": {
                "tip": "Dica",
                "tip_gif_alt": "GIF da dica",
                "tip_default_text": "Use este formulário para enviar seu mangá. Preencha todos os campos obrigatórios antes de clicar em 'Enviar'.",
                "previous": "Voltar",
                "next": "Continuar",
                "finish": "Finalizar",
                "tip_project": "Projeto: Identifique o projeto ao qual este upload pertence.",
                "tip_group": "Grupo: Selecione o grupo responsável por este mangá.",
                "tip_language": "Linguagem: Escolha o idioma do mangá.",
                "tip_title": "Título: Insira o título do capítulo, se houver.",
                "tip_volume": "Volume: Insira o volume correspondente, se aplicável.",
                "tip_chapter": "Capítulo: Número do capítulo que está sendo enviado.",
                "tip_single_chapter": "Capítulo Único: Marque se este for um capítulo único.<br><strong>Aviso:</strong> Caso esteja marcada, tanto volume quanto o capítulo não serão enviados.",
                "tip_folder": "Pasta: Indique a pasta onde as imagens estão armazenadas.",
                "tip_datetime": "Data e Hora da publicação: Selecione quando a publicação deve ocorrer.<br><strong>Aviso:</strong> O tempo máximo aceito é de 2 semanas."
            }
        },

        "console_and_alert": {
            "alert": {
                "group_already_added": "Este grupo já foi adicionado."
            },
            "console": {
                "error_select_folder": "Erro ao selecionar a pasta: ",
                "error_select_file": "Erro ao selecionar o arquivo: "
            }
        }
    },

    "upload_mult": {
        "#comment1": "Rota: /mult_upload",
        "#comment2": "Página para enviar vários capítulo",
        "multi_upload": "Upload Multi",
        "project": "Projeto:",
        "enter_project_name": "Digite o nome do projeto",
        "language": "Linguagem:",
        "portuguese_brazil": "Português (Brasil)",
        "english": "Inglês",
        "parent_folder": "Pasta Pai:",
        "enter_folder_path": "Insira o caminho da pasta",
        "continue": "Continuar",
        "files_and_folders": "Arquivos e Pastas Encontrados:",
        "no_items": "Nenhum item com imagens foi encontrado.",
        "upload": "Enviar",
        "reload_folder": "Recarregar pasta",

        "modal": {
            "group": {
                "create_or_select_group": "Criar ou Selecionar Grupo",
                "group_name": "Nome do Grupo:",
                "enter_group_name": "Digite o nome do grupo",
                "group": "Grupo:",
                "create_new_group": "Criar Novo Grupo",
                "scan_group": "Grupo (Scan/Equipe):",
                "enter_scan_group": "Digite o nome da Scan/Grupo",
                "volume": "Volume:",
                "enter_volume": "Digite o volume",
                "selected_items": "Itens Selecionados:",
                "create_group": "Criar Grupo",
                "save_group": "Salvar Grupo",
                "close": "Fechar",
                "delete_group": "Excluir Grupo"
            },
            "tip": {
                "title": "Introdução",
                "description": "Esta página é destinada para enviar vários capítulos de uma vez para a fila de um projeto específica.",
                "next": "Continuar",
                "prev": "Voltar",
                "finish": "Finalizar",

                "select_project_title": "Selecionar o Projeto",
                "select_project_img_alt": "Demonstração de selecionar projeto",
                "select_project_description": "Para selecionar o projeto, basta digitar o nome ou UUID. Caso o projeto tenha a tag <strong>long strip</strong>, será exibida uma notificação recomendando a ferramenta de corte <strong>SmartStitch</strong> que pode ser definida na página de configurações.",
                "select_project_error": "Se o ID estiver incorreto, aparecerá uma mensagem de erro no canto inferior direito.",

                "select_language_title": "Selecionar o Idioma",
                "select_language_img_alt": "Selecionar o idioma",
                "select_language_description": "Escolha o idioma correto (por exemplo, Português (Brasil) ou Inglês) antes de prosseguir com o envio dos capítulos.",

                "select_folder_title": "Selecionar a Pasta",
                "select_folder_img_alt": "Selecionar a pasta dos capítulos",
                "select_folder_description": "Selecione a pasta onde os arquivos estão localizados. Se o dispositivo for detectado como Android, o campo de pasta será desativado e preenchido automaticamente."
            },
            "tip_pc": {
                "title": "Introdução",
                "description": "Aqui será onde você criará os grupos de capítulos que serão enviados.",
                "shortcuts": "Atalhos:",
                "shortcut_select_all": "<strong>Ctrl + A</strong> para selecionar todos os capítulos",
                "shortcut_select_specific": "<strong>Ctrl + Clique (em itens)</strong> para selecionar capítulos específicos",
                "shortcut_select_range": "<strong>Shift + Clique (em itens)</strong> para selecionar um intervalo de capítulos",

                "create_group_mode_1_title": "Criar Grupo: modo 1",
                "create_group_mode_1_img_alt": "Criar grupo modo 1",
                "create_group_mode_1_description": "Caso tenha certeza de que todos os capítulos pertencem ao mesmo grupo, você pode criar um grupo com todos os capítulos selecionados. Uma forma de selecionar todos os capítulos é pressionar <strong>Ctrl + A</strong>.",
                "create_group_mode_1_tip": "<strong>Dica:</strong>",
                "create_group_mode_1_tip_details": "Caso tenha utilizado as outras funcionalidades que serão apresentadas para criar grupos e ficaram separados, você ainda pode utilizar esse atalho, pois não irá afetar os grupos já criados.",

                "create_group_mode_2_title": "Criar Grupo: modo 2",
                "create_group_mode_2_img_alt": "Criar grupo modo 2",
                "create_group_mode_2_description": "Caso queira selecionar capítulos específicos para criar um grupo, você pode clicar em cada um deles enquanto pressiona <strong>Ctrl</strong>.",

                "create_group_mode_3_title": "Criar Grupo: modo 3",
                "create_group_mode_3_img_alt": "Criar grupo modo 3",
                "create_group_mode_3_description": "Caso queira selecionar um intervalo de capítulos para criar um grupo, você pode clicar no primeiro capítulo, pressionar <strong>Shift</strong> e clicar no último capítulo.",
                "create_group_mode_3_additional_info": "<strong>Informação adicional:</strong>",
                "create_group_mode_3_additional_info_details": "Caso tenha grupos já criados e o intervalo de capítulos selecionados esteja entre eles, não se preocupe, pois não irá afetar os grupos já criados.",

                "add_chapter_mode_1_title": "Adicionar Capítulo: modo 1",
                "add_chapter_mode_1_img_alt": "Adicionar capítulo modo 1",
                "add_chapter_mode_1_description": "Caso queira adicionar um capítulo a um grupo já existente, primeiro selecione o(s) capítulo(s) que deseja adicionar com o <strong>Ctrl</strong> e clique em algum capítulo do grupo desejado com o <strong>Ctrl</strong>, em seguida, clique em 'Editar Grupo' e depois em 'Salvar alterações'.",

                "add_chapter_mode_2_title": "Adicionar Capítulo: modo 2",
                "add_chapter_mode_2_img_alt": "Adicionar capítulo modo 2",
                "add_chapter_mode_2_description": "Caso queira adicionar um intervalo de capítulos a um grupo já existente. Primeiro selecione um capítulo sem grupo, depois pressione <strong>Shift</strong> e clique no último capítulo do intervalo. Em seguida, clique em algum capítulo do grupo desejado com o <strong>Ctrl</strong>, clique em 'Editar Grupo' e depois em 'Salvar alterações'.",

                "delete_group_title": "Excluir Grupo",
                "delete_group_img_alt": "Excluir grupo modo 1",
                "delete_group_description": "Para remover um grupo, clique no grupo desejado e depois em 'Editar Grupo'. Em seguida, clique em 'Excluir Grupo'.",

                "delete_group_remove_specific_title": "Excluir Grupo e Remover Capítulos Específicos",
                "delete_group_remove_specific_img_alt": "Excluir grupo modo 2",
                "delete_group_remove_specific_description": "Para remover um grupo é igual a página anterior, mas caso queira remover capítulos específicos, clique no grupo desejado e depois em 'Editar Grupo'. Clique nos capítulos que deseja remover e depois em 'Salvar alterações'.",

                "next": "Continuar",
                "prev": "Voltar",
                "finish": "Finalizar"
            },
            "tip_android": {
                "title": "Introdução",
                "description": "Aqui será onde você criará os grupos de capítulos que serão enviados.",
                "shortcuts": "Atalhos:",
                "shortcut_select_all": "<strong>Toque longo</strong> para selecionar todos os capítulos",
                "shortcut_select_specific": "<strong>Toque simples (em itens)</strong> para selecionar capítulos específicos",
                "shortcut_select_range": "<strong>Toque duplo (em itens)</strong> para selecionar um intervalo de capítulos",

                "create_group_mode_1_title": "Criar Grupo: modo 1",
                "create_group_mode_1_img_alt": "Criar grupo modo 1",
                "create_group_mode_1_description": "Caso tenha certeza de que todos os capítulos pertencem ao mesmo grupo, você pode criar um grupo com todos os capítulos selecionados. Uma forma de selecionar todos os capítulos é pressionar a tela por <strong>0,8 segundos</strong>.",
                "create_group_mode_1_tip": "<strong>Dica:</strong>",
                "create_group_mode_1_tip_details": "Caso tenha utilizado as outras funcionalidades que serão apresentadas para criar grupos e ficaram separados, você ainda pode utilizar esse atalho, pois não irá afetar os grupos já criados.",

                "create_group_mode_2_title": "Criar Grupo: modo 2",
                "create_group_mode_2_img_alt": "Criar grupo modo 2",
                "create_group_mode_2_description": "Caso queira selecionar capítulos específicos para criar um grupo, você pode simplesmente tocar (selecionar) cada um deles com um <strong>toque simples</strong>.",

                "create_group_mode_3_title": "Criar Grupo: modo 3",
                "create_group_mode_3_img_alt": "Criar grupo modo 3",
                "create_group_mode_3_description": "Caso queira selecionar um intervalo de capítulos para criar um grupo, você pode tocar (selecionar) o primeiro capítulo, depois dar <strong>duplo toque</strong> no último capítulo.",
                "create_group_mode_3_additional_info": "<strong>Informação adicional:</strong>",
                "create_group_mode_3_additional_info_details": "Caso tenha grupos já criados e o intervalo de capítulos selecionados esteja entre eles, não se preocupe, pois não irá afetar os grupos já criados.",

                "add_chapter_mode_1_title": "Adicionar Capítulo: modo 1",
                "add_chapter_mode_1_img_alt": "Adicionar capítulo modo 1",
                "add_chapter_mode_1_description": "Caso queira adicionar um capítulo a um grupo já existente, primeiro selecione o(s) capítulo(s) que deseja adicionar com um <strong>toque simples</strong> e clique em algum capítulo do grupo desejado com um <strong>toque simples</strong>, em seguida, clique em 'Editar Grupo' e depois em 'Salvar alterações'.",

                "add_chapter_mode_2_title": "Adicionar Capítulo: modo 2",
                "add_chapter_mode_2_img_alt": "Adicionar capítulo modo 2",
                "add_chapter_mode_2_description": "Caso queira adicionar um intervalo de capítulos a um grupo já existente, primeiro toque (selecione) um capítulo sem grupo, depois <strong>duplo toque</strong> no último capítulo do intervalo. Em seguida, toque (selecione) em algum capítulo do grupo desejado com um <strong>toque simples</strong>, clique em 'Editar Grupo' e depois em 'Salvar alterações'.",

                "delete_group_title": "Excluir Grupo",
                "delete_group_img_alt": "Excluir grupo modo 1",
                "delete_group_description": "Para remover um grupo, toque (selecione) um grupo desejado e depois em 'Editar Grupo'. Em seguida, clique em 'Excluir Grupo'.",

                "delete_group_remove_specific_title": "Remover Capítulos Específicos",
                "delete_group_remove_specific_img_alt": "Excluir grupo modo 2",
                "delete_group_remove_specific_description": "Para remover capítulos específicos, clique no grupo desejado e depois em 'Editar Grupo'. Clique nos capítulos que deseja remover e depois em 'Salvar alterações'.",

                "next": "Continuar",
                "prev": "Voltar",
                "finish": "Finalizar"
            }
        },

        "script": {
            "context_menu": {
                "create_group": "Criar Grupo",
                "edit_group": "Editar Grupo"
            },
            "search_groups": {
                "group_search_error": "Erro ao buscar grupo",
                "group_already_added": "Grupo já adicionado!"
            },
            "search_projects": {
                "long_strip_tag": "Projeto com a Tag Long Strip.",
                "recommended_tool": "Recomendado o uso da ferramenta SmartStitch.",
                "project_not_found": "Projeto não encontrado pela UUID",
                "project_search_error": "Erro ao buscar projeto"
            },
            "main": {
                "upload_success": "Enviado para fila!",
                "chapter_skiped": "Capítulo pulado",
                "project": "Projeto",
                "chapter": "Capítulo",
                "title": "Título",
                "language": "Idioma",
                "error_occurred": "Ocorreu um erro",
                "create_new_group": "Criar Novo Grupo",
                "create_group": "Criar Grupo",
                "edit_group": "Editar Grupo",
                "created_group": "Grupo criado",
                "modal_closed": "Modal fechado e seleção limpa.",
                "need_project": "Por favor, adicione um projeto.",
                "need_valid_path": "Por favor, insira um caminho válido para a pasta.",
                "error_proccess_path": "Erro ao processar o caminho da pasta",
                "error_send_path": "Erro ao enviar o caminho da pasta.",
                "progress": "Progresso:",
                "function_createTemporaryButton_called": "Função createTemporaryButton chamada",
                "function_showGroupModal_called": "Função showGroupModal chamada",
                "editing_group": "Editando grupo:",
                "group_not_found": "Grupo \"{group_name}\" não encontrado.",
                "save_changes": "Salvar Alterações",
                "remove_item_temporarily": "Tentando remover item \"{index}\" temporáriamente",
                "delete_group_exclude_item": "Remover o último item irá excluir o grupo. Deseja continuar?",
                "group_deleted": "Grupo \"{group_name}\" removido com sucesso.",
                "save_changes_group": "Salvando mudanças no grupo \"{group_name}\"",
                "filename_not_found_in_list": "Arquivo não encontrado na lista: ",
                "updated_items": "Items atualizados: ",
                "group_after_update": "Grupo \"{group_name}\" depois das mudanças: ",
                "group_name": "Grupo",
                "title_element_not_found": "Elemento do título do projeto não encontrado.",
                "deleting_group": "Deletando grupo:",
                "project_": "Projeto:",
                "chapter_": "Capítulo:",
                "language_": "Iidioma:",
                "no_groups": "Nenhum grupo foi criado.",
                "group_created": "Grupo \"{group_name}\" criado com sucesso!",
                "saving_changes_group": "Salvando mudanças no grupo: {group_name}",
                "group_updated": "Grupo \"{group_name}\" atualizado com sucesso!",
                "group_change_add_item": "Foram adicionados {addedCount} capítulo(s) ao grupo \"{group_name}\"",
                "group_change_remove_item": "Foram removidos {removedCount} capítulo(s) do grupo \"{group_name}\""
            }
        }
    },

    "search": {
        "#comment1": "Rota: /search",
        "#comment2": "Página de busca de mangás",
        "search_manga": "Buscar Mangá",
        "edit_manga": "Editar Mangá",
        "enter_manga_name": "Digite o nome do mangá...",
        "previous": "Anterior",
        "next": "Próximo",
        "no_results": "Nenhum resultado encontrado.",
        "search_error": "Erro ao buscar dados. Tente novamente mais tarde.",
        "load_more": "Carregar mais",
        "progress": "Progresso:"
    },

    "downloads": {
        "#comment1": "Rota: /details/<manga_id>",
        "#comment2": "Página de detalhes do mangá",
        "manga_details": "Detalhes do Mangá",
        "manga_cover_alt": "Capa do Mangá",
        "view_on_mangadex": "Ver no MangaDex",
        "about": "Sobre",
        "download_all_chapters": "Baixar Todos os Capítulos",
        "author": "Autor",
        "artist": "Artista",
        "status": "Status",
        "reverse_button": "Inverter Ordem",
        "unknown_title": "Título Desconhecido",
        "no_volume": "Sem Volume",
        "unknown_group": "Grupo Desconhecido",
        "chapters_no_volume": "Capítulos Sem Volume",
        "only": "Único",
        "groups": "Grupos:",
        "check_download_chapter": "Verificando download para o capítulo: ",
        "chapter": "Capítulo",
        "unknown": "Desconhecido",

        "console_and_alert": {
            "alert": {
                "chapter_not_downloaded": "Capítulo não está baixado.",
                "not_images_for_chapter": "Nenhuma imagem encontrada para este capítulo."
            },
            "console": {
                "download_chapter_error": "Erro ao baixar capítulos: ",
                "none_chapter": "Nenhum capítulo encontrado ou formato inválido.",
                "error_get_chapters": "Erro ao obter capítulos: ",
                "error_fetching_chapters": "Erro ao buscar capítulos.",
                "error_fetching_details": "Erro ao buscar detalhes do mangá."
            }
        }
    },

    "edits": {
        "#comment1": "Rota: /edit_details/<manga_id>",
        "#comment2": "Página de edição de capítulos do mangá",
        "manga_details_edit": "Editar Detalhes do Mangá",
        "manga_cover_alt": "Capa do Mangá",
        "view_on_mangadex": "Ver no MangaDex",
        "about": "Sobre",
        "author": "Autor",
        "artist": "Artista",
        "status": "Status",

        "modal": {
            "chapter": {
                "chapter_details": "Detalhes do Capítulo",
                "title": "Título",
                "volume": "Volume",
                "chapter": "Capítulo",
                "group": "Grupo",
                "exclude": "Excluir",
                "cancel": "Cancelar",
                "edit": "Editar"
            }
        },

        "console_and_alert": {
            "alert": {
                "error_fetching_details": "Erro ao buscar detalhes do mangá.",
                "chapter_edited_error": "Erro ao editar capítulo.",
                "chapter_excluded_error": "Erro ao excluir capítulo.",
                "chapter_excluded_success": "Capítulo excluído com sucesso!",
                "confirm_delete": "Tem certeza que deseja excluir este capítulo?",
                "group_already_added": "Este grupo já foi adicionado.",
                "chapter_edited_success": "Capítulo editado com sucesso!"
            },
            "console": {
                "error_fetching_details": "Erro ao buscar detalhes do mangá.",
                "error_fetching_chapters": "Erro ao buscar capítulos do mangá.",
                "chapter_edited_error_detail": "Erro ao editar capítulo: ",
                "chapter_excluded_error_detail": "Erro ao excluir capítulo: ",
                "error_get_details_chapters": "Erro ao buscar detalhes do capítulo: "
            }
        }
    },

    "updates": {
        "#comment1": "Rota: /updates",
        "#comment2": "Página de atualizações",
        "updates_title": "Atualizações",
        "back_button": "Voltar",
        "update_button": "Atualizar",
        "close": "Fechar",
        "load_versions": "Carregando versões...",
        "not_versions": "Nenhuma versão encontrada.",
        "stable": "Estável",
        "error_load_versions": "Erro ao carregar as versões.",
        "download": "Baixar",

        "console_and_alert": {
            "alert": {
                "update_success": "Atualização realizada com sucesso! Reinicie...",
                "update_error": "Erro ao realizar atualização.",
                "sucess_change_version": "Mudança de versão concluída com sucesso!",
                "error_change": "Erro ao atualizar."
            },
            "console": {
                "update_error": "Erro ao realizar atualização: ",
                "get_version_error": "Erro ao obter versões: ",
                "error_version": "Erro na atualização: "
            }
        }
    },

    "logs": {},

    "modal": {
        "queue": {
            "confirmation_title": "Confirmação",
            "message_1": "Foi detectado que não foram todos os uploads enviados!",
            "message_2": "O que você deseja fazer?",
            "delete_all": "Apagar Tudo",
            "send_again": "Enviar Novamente"
        }
    },

    "script": {
        "notification": {
            "test_message": "🚀 Mensagem de teste exibida!",
            "upload": {
                "success": "✅ Capítulo enviado com sucesso: {manga_title} - Capítulo {chapter}",
                "error": "❌ Erro no envio do capítulo: {manga_title} - Capítulo {chapter}<br>Erro: {error}",
                "cancelled": "❌ Cancelado envio do capítulo: {manga_title} - Capítulo {chapter}<br>Detalhes: {detail}",
                "starting": "⌛ Iniciando envio do capítulo: {manga_title} - Capítulo {chapter}"
            },
            "download": {
                "success": "✅ Download concluído: {manga_title} - Capítulo {chapter}",
                "error": "❌ Erro no download: {manga_title} - Capítulo {chapter}<br>Erro: {error}",
                "cancelled": "❌ Cancelado download: {manga_title} - Capítulo {chapter}<br>Detalhes: {details}",
                "starting": "⌛ Iniciando download: {manga_title} - Capítulo {chapter}"
            }
        },

        "debug": {
            "event": "Evento",
            "element": "Elemento",
            "id": "ID",
            "no_id": "Sem ID",
            "class": "Classe",
            "no_class": "Sem classe",
            "coordinates": "Coordenadas",
            "target_element": "Elemento alvo",
            "element_id": "ID do elemento",
            "element_class": "Classe(s) do elemento",
            "element_type": "Tipo do elemento",
            "click_coordinates": "Coordenadas do clique"
        },

        "socket": {
            "connect": "Conectado ao servidor",
            "disconnect": "Desconectado do servidor"
        }
    },

    "create_work": {
        "#comment1": "Rota: /create-work",
        "#comment2": "Página para verificar e criar obras",
        "title": "Criar Obra",
        "introduction_title": "Introdução",
        "introduction_text": "Nesta página você pode verificar se uma obra existe e, caso não, criá-la.",
        "shortcuts": "Atalhos:",
        "shortcut_swipe": "Deslize para direita",
        "shortcut_mangaupdates": "para abrir o site do MangaUpdates",
        "continue": "Continuar",
        "input_demo": "Demonstração do input",
        "input_description": "Insira o link do MangaUpdates ou o ID no campo de input e aguarde enquanto carrega os resultados.",
        "example_url": "Exemplo de URL:",
        "example_id": "Exemplo de ID:",
        "back": "Voltar",
        "result_demo": "Demonstração dos resultados",
        "result_description": "Os resultados no modal podem ser clicados para redirecioná-lo à página do projeto. Caso tenha certeza de que o projeto procurado não esteja entre eles, clique no botão <strong>Criar Obra</strong> abaixo.",
        "result_found": "Caso o projeto procurado seja encontrado, ele ocupará o espaço principal e os outros resultados serão exibidos abaixo.",
        "finish": "Finalizar",
        "input_placeholder": "Digite a URL ou ID",
        "create_work_button": "Criar Obra",

        "script": {
            "input_error": "Input inválido. Informe um link válido ou um ID com 7 caracteres.",
            
            "sended": "Enviado: ",
            "status": "Status:",
            "year": "Ano:",
            "original_language": "Idioma Original:",

            "swipe_right": "Swipe para a direita detectado"
        }
    },

    "create_draft": {
        "#comment1": "Rota: /create-draft",
        "#comment2": "Página para criar rascunho de obras",
        "title": "Criar Rascunho",
        "introduction": "Criar Rascunho de Obra",
        "alert_roles": "Certifique-se de ler as instruções!",

        "after_save": {
            "draft_created": "Rascunho criado",
            "check_draft": "Verificar rascunho (precisa estar logado)",
            "go_to_drafts": "Ir para rascunhos criados (precisa estar logado)",
            "submit": "Enviar"
        },

        "menu": {
            "all": "Todos",
            "works": "Obra",
            "metadata": "Metadados",
            "tags": "Tags",
            "sites": "Sites",
            "associateds": "Relacionados",
            "covers": "Capas"
        },

        "roles": {
            "guidelines": "Diretrizes das Obras",

            "prohibited_entries": "Não crie pedidos de entrada para:",
            "no_western_comics": "Quadrinhos ocidentais (p.ex. Marvel, DC),",
            "no_self_made_without_permission": "Quadrinhos que você mesmo criou sem primeiro obter permissão de um membro da equipe (no Discord),",
            "no_duplicate_entries": "Duplicatas de uma obra já existente (pesquise primeiro),",

            "general_rules": "Gerais:",
            "cover_must_be_original_language": "Pelo menos uma capa deve estar no idioma de origem do título.",
            "main_cover_latest_volume": "Se o seu cargo permitir que você escolha a capa principal, use a do volume mais recente, a menos que ela não se encaixe em geral no estilo de arte ou no tema da obra ou tenha grandes spoilers.",
            "duplicate_entries_only_for_colored_versions": "Você só pode criar uma entrada duplicada para a versão colorida oficialmente e por fãs de uma série.",
            "no_troll_or_spam_entries": "Tentar criar entradas troll/spam resultará na revogação das permissões.",
            "submit_entry_after_finishing": "Não se esqueça de submeter sua entrada ao finalizar.",

            "cover_requirements": "Requisitos e limites dos arquivos de capa:",
            "max_cover_size": "Cada capa pode ter no máximo (10000 x 10000) pixels.",
            "vertical_covers_preferred": "Capas com orientação vertical são preferidas sempre que possível.",
            "max_cover_file_size": "O tamanho máximo de arquivo por imagem é de 20 MB.",
            "supported_image_formats": "Os formatos de imagem suportados são JPEG, PNG e GIF."
        },

        "container": {
            "title": {
                "title": "Título (1)",
                "alternative": "Títulos alternativos (0)",
                "description": "Outros títulos para esta obra. Isso inclui títulos traduzidos, o título em sua língua e alfabeto original, abreviações, etc."
            },

            "author": {
                "sync_authors_artists": "Sincronizar autores e artistas",
                "authors": "Autores",
                "artists": "Artistas",
                "none_selected": "Nenhum selecionado."
            },

            "tags": {
                "original_language": "Linguagem Original",
                "select_language": "Selecionar Linguagem",

                "content_rating": "Classificação do Conteúdo",
                "select_rating": "Selecionar Classificação",

                "publication_status": "Estado da Publicação",
                "select_status": "Selecionar Estado",

                "publication_year": "Ano de Publicação",
                "year_of_publication": "Ano da Publicação",

                "magazine_demography": "Demografia da Revista",

                "final_chapter": "Capítulo Final",
                "volume_number": "Número do Volume",
                "chapter_number": "Número do Capítulo",

                "content_warning": "Advertência de conteúdo",
                "format": "Formato",
                "genre": "Gênero",
                "theme": "Tema"
            },

            "sites": {},

            "associateds": {},

            "covers": {
                "title": "Capas (0)",
                "description": "Use a capa original na língua original quando possível. Pelo menos 1 capa na linguagem original em todos os casos. Preferencialmente na melhor qualidade possível e em orientação vertical. O formato deve ser JPEG, PNG, GIF.",
                "show_covers": "Mostrar Capas",
                "add_cover": "Clique ou arraste para adicionar os arquivos"
            },

            "cancel": "Cancelar",
            "save": "Salvar"
        },

        "script": {
            "cover": {
                "cover_language": "Linguagem da Capa",
                "select_language": "Selecionar Linguagem",
                "no_volume": "Sem Volume",
                "covers": "Capas",
                "main_cover": "Capa principal",
                "set_as_main_cover": "Marcar como capa principal",
                "volume": "Volume"
            },

            "data": {
                "session_stored_data": "Dados armazenados na sessão:",
                "error_parsing_draft_data": "Erro ao analisar os dados do draftData:",
                "no_data_saved": "Nenhum dado salvo na sessão.",
                "api_response": "Resposta da API:",
                "request_error": "Erro na requisição:",
                "image_loading_error": "Erro ao carregar a imagem:"
            },

            "filter": {
                "all": "todos"
            },

            "metadata": {
                "artists": "Artistas",
                "create": "Criar",
                "sent_by_socket_uuid": "Enviado pelo socket de UUID:",
                "sent_by_regular_socket": "Enviado pelo socket regular:",
                "clicked_author": "Autor clicado:",
                "none_selected": "Nenhum selecionado.",
                "create_clicked_author": "Criar autor clicado",
                "empty_container_no_comparison": "Um dos containers está vazio. Nenhuma comparação necessária.",
                "authors_not_in_artists": "Autores que não estão nos artistas:",
                "artists_not_in_authors": "Artistas que não estão nos autores:",
                "all_ids_match": "Todos os IDs correspondem entre os dois containers.",
                "authors_create": "Criar (Autores)",
                "cancel": "Cancelar",
                "confirm": "Confirmar"
            },

            "associated": {},

            "save": {
                "title_cannot_be_empty": "O título não pode estar vazio.",
                "title": "Título:",
                "title_alternative_all": "TitleAlternativeAll:",
                "alternative_title_cannot_be_empty": "O título alternativo não pode estar vazio.",
                "language_cannot_be_empty": "O idioma não pode estar vazio.",
                "title_alternative": "Títulos alternativos:",

                "select_language": "Selecionar Linguagem",
                "select_a_language": "Selecione um idioma.",
                "original_language": "Idioma Original:",
                "language_code": "Código do Idioma:",

                "content_rating_cannot_be_empty": "A classificação do conteúdo não pode estar vazia.",
                "select_rating": "Selecionar Classificação",
                "select_content_rating": "Selecione uma classificação de conteúdo.",
                "content_rating": "Classificação do Conteúdo:",

                "content_status_cannot_be_empty": "O status do conteúdo não pode estar vazio.",
                "select_status": "Selecionar Estado",
                "select_content_status": "Selecione um status do conteúdo.",
                "content_status": "Estado do Conteúdo:",

                "volume_and_chapter_cannot_be_empty": "O volume e o capítulo não podem estar vazios.",
                "chapter_cannot_be_empty": "O capítulo não pode estar vazio.",
                "volume": "Volume:",
                "chapter": "Capítulo:",

                "authors": "Autores:",
                "artists": "Artistas:",
                "add_at_least_one_author": "Adicione pelo menos um autor.",
                "add_at_least_one_artist": "Adicione pelo menos um artista.",

                "year": "Ano:",

                "genre_found": "Gênero encontrado:",

                "select_cover_language": "Selecione um idioma para a capa.",

                "error_getting_base64_image": "Erro ao obter a imagem base64.",
                "upload_successful": "Upload bem-sucedido:",
                "upload_error": "Erro no upload:",

                "main_cover": "Capa principal",
                "no_base64_image_found": "Nenhuma imagem Base64 encontrada na página.",

                "draft_not_created": "O rascunho ainda não foi criado.",
                "draft_sent_successfully": "Rascunho enviado com sucesso."
            },

            "sites": {},

            "tags": {
                "adding_include_class": "Adicionando classe 'include'...",
                "removing_include_class": "Removendo classe 'include'..."
            },

            "title": {
                "title_alternatives": "Títulos alternativos"
            }
        }
        
    }
}