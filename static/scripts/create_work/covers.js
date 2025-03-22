document.addEventListener("DOMContentLoaded", () => {
    const coverAdd = document.getElementById('covers-container');
    coverAdd.firstElementChild.addEventListener('click', function() {});
    document.getElementById('file').addEventListener('change', function(event) {
        const files = event.target.files; // Obtém os arquivos selecionados
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                if (files[i].type.startsWith("image/")) { // Apenas imagens
                    processImage(files[i], null);
                }
            }
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const dropArea = document.body; // Pode ser um elemento específico

    // Previne o comportamento padrão do navegador
    ["dragenter", "dragover", "dragleave", "drop"].forEach(event => {
        dropArea.addEventListener(event, e => e.preventDefault());
    });

    // Evento quando um arquivo é solto na página
    dropArea.addEventListener("drop", (event) => {
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            for (const file of files) {
                if (file.type.startsWith("image/")) { // Apenas imagens
                    processImage(file, null);
                }
            }
        }
    });
});

function processImage(file, language) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const title = document.getElementById('title-covers');
        const covers = document.getElementById('covers-container');

        covers.insertAdjacentHTML(
            'afterbegin',
            `
                <div data-v-f76e628c="" data-v-90f359e4="" class="wrap flex-grow-0">
                    <div data-v-f76e628c="" class="page-sizer">
                        <div data-v-f76e628c="" class="page" style="background-image: url(&quot;${reader.result}&quot;);">
                            <!---->
                            <div data-v-f76e628c="" class="close">
                                <svg data-v-9ba4cb7e="" data-v-f76e628c="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-white">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                                </svg>
                            </div>
                            <div data-v-f76e628c="" class="volume-accent">
                                <span data-v-f76e628c="">Volume 1</span>
                                ${language ? `
                                        <img class="inline-block select-none volume-flag" title="${language.language}" src="${language.flag}" alt="${language.language} flag icon" width="24" height="24">
                                    ` : `
                                        <img class="inline-block select-none volume-flag" title="Other" src="/static/flags/unknown.svg" alt="Other flag icon" width="24" height="24">
                                    `}
                                <!---->
                            </div>
                            <div data-v-f76e628c="" class="main-star" title="Marcar como capa principal">
                                <svg data-v-9ba4cb7e="" data-v-f76e628c="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-star icon small text-icon-contrast text-undefined" viewBox="0 0 24 24">
                                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path>
                                </svg>
                            </div>
                            <div data-v-f76e628c="" class="page-preview-button">
                                <svg data-v-9ba4cb7e="" data-v-f76e628c="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-eye icon text-icon-contrast text-undefined" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div data-v-c7ac6a42="" data-v-f76e628c="" class="md-select focus:outline-none bg-accent" tabindex="0" style="border-bottom: 1px solid rgb(var(--md-accent-10));">
                        <div data-v-c7ac6a42="" class="md-select-inner-wrap rounded cursor-pointer block" style="min-width: 0px;">
                            <div data-v-c7ac6a42="" class="flex-grow relative py-[0.3125rem]">
                                <div data-v-c7ac6a42="" class="mb-1 text-xs h-4"></div>
                                <div data-v-c7ac6a42="" class="absolute top-4 transition-label with-placeholder">
                                ${t_script.cover.cover_language}
                                <!---->
                                </div>
                                <div data-v-c7ac6a42="" class="placeholder-text opacity-40 with-label" style="min-height: 1em;">
                                <!---->
                                ${t_script.cover.select_language}
                                </div>
                            </div>
                            <svg data-v-9ba4cb7e="" data-v-c7ac6a42="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-down icon text-icon-contrast text-undefined chevron ml-1 flex-shrink-0 my-4" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6"></path>
                            </svg>
                        </div>
                        <div data-v-c7ac6a42="" id="list" class="fixed overflow-x-hidden overscroll-contain z-10 bg-accent shadow rounded-b" style="display: none;">
                        ${[
                            { flag: "/static/flags/jp.svg", title: "Japanese" },
                            { flag: "/static/flags/kr.svg", title: "Korean" },
                            { flag: "/static/flags/cn.svg", title: "Chinese (Simplified)" },
                            { flag: "/static/flags/hk.svg", title: "Chinese (Traditional)" },
                            { flag: "/static/flags/gb.svg", title: "English" },
                            { flag: "/static/flags/za.svg", title: "Afrikaans" },
                            { flag: "/static/flags/sq.svg", title: "Albanian" },
                            { flag: "/static/flags/sa.svg", title: "Arabic" },
                            { flag: "/static/flags/az.svg", title: "Azerbaijani" },
                            { flag: "/static/flags/eu.svg", title: "Basque" },
                            { flag: "/static/flags/by.svg", title: "Belarusian" },
                            { flag: "/static/flags/bd.svg", title: "Bengali" },
                            { flag: "/static/flags/bg.svg", title: "Bulgarian" },
                            { flag: "/static/flags/mm.svg", title: "Burmese" },
                            { flag: "/static/flags/ad.svg", title: "Catalan" },
                            { flag: "/static/flags/ru-cu.svg", title: "Chuvash" },
                            { flag: "/static/flags/hr.svg", title: "Croatian" },
                            { flag: "/static/flags/cz.svg", title: "Czech" },
                            { flag: "/static/flags/dk.svg", title: "Danish" },
                            { flag: "/static/flags/nl.svg", title: "Dutch" },
                            { flag: "/static/flags/eo.svg", title: "Esperanto" },
                            { flag: "/static/flags/et.svg", title: "Estonian" },
                            { flag: "/static/flags/ph.svg", title: "Filipino" },
                            { flag: "/static/flags/fi.svg", title: "Finnish" },
                            { flag: "/static/flags/fr.svg", title: "French" },
                            { flag: "/static/flags/ka.svg", title: "Georgian" },
                            { flag: "/static/flags/de.svg", title: "German" },
                            { flag: "/static/flags/gr.svg", title: "Greek" },
                            { flag: "/static/flags/il.svg", title: "Hebrew" },
                            { flag: "/static/flags/in.svg", title: "Hindi" },
                            { flag: "/static/flags/hu.svg", title: "Hungarian" },
                            { flag: "/static/flags/id.svg", title: "Indonesian" },
                            { flag: "/static/flags/ie.svg", title: "Irish" },
                            { flag: "/static/flags/it.svg", title: "Italian" },
                            { flag: "/static/flags/id.svg", title: "Javanese" },
                            { flag: "/static/flags/kz.svg", title: "Kazakh" },
                            { flag: "/static/flags/ri.svg", title: "Latin" },
                            { flag: "/static/flags/lt.svg", title: "Lithuanian" },
                            { flag: "/static/flags/my.svg", title: "Malay" },
                            { flag: "/static/flags/mn.svg", title: "Mongolian" },
                            { flag: "/static/flags/np.svg", title: "Nepali" },
                            { flag: "/static/flags/no.svg", title: "Norwegian" },
                            { flag: "/static/flags/ir.svg", title: "Persian" },
                            { flag: "/static/flags/pl.svg", title: "Polish" },
                            { flag: "/static/flags/pt.svg", title: "Portuguese" },
                            { flag: "/static/flags/br.svg", title: "Portuguese (Br)" },
                            { flag: "/static/flags/ro.svg", title: "Romanian" },
                            { flag: "/static/flags/ru.svg", title: "Russian" },
                            { flag: "/static/flags/rs.svg", title: "Serbian" },
                            { flag: "/static/flags/sk.svg", title: "Slovak" },
                            { flag: "/static/flags/si.svg", title: "Slovenian" },
                            { flag: "/static/flags/es.svg", title: "Spanish" },
                            { flag: "/static/flags/mx.svg", title: "Spanish (LATAM)" },
                            { flag: "/static/flags/se.svg", title: "Swedish" },
                            { flag: "/static/flags/tam.svg", title: "Tamil" },
                            { flag: "/static/flags/tel.svg", title: "Telugu" },
                            { flag: "/static/flags/th.svg", title: "Thai" },
                            { flag: "/static/flags/tr.svg", title: "Turkish" },
                            { flag: "/static/flags/ua.svg", title: "Ukrainian" },
                            { flag: "/static/flags/pk.svg", title: "Urdu" },
                            { flag: "/static/flags/uz.svg", title: "Uzbek" },
                            { flag: "/static/flags/vn.svg", title: "Vietnamese" }
                        ].map(lang => `
                            <div data-v-c7ac6a42="" id="list-item" class="px-4 py-2 hover:bg-accent-10 active:bg-accent-10 cursor-pointer" tabindex="-1" role="option">
                                <img class="inline-block select-none" title="${lang.title}" src="${lang.flag}" alt="${lang.title} flag icon" width="24" height="24">
                                <!---->
                                ${lang.title}
                            </div>`).join('')}
                            <!---->
                        </div>
                        <!---->
                    </div>
                    <div data-v-f76e628c="" class="relative flex-shrink min-w-0">
                        <div data-v-c019d6aa="" data-v-f76e628c="" class="md-input volume-num flex-shrink flex-grow-0">
                            <div data-v-c019d6aa="" class="md-inputwrap md-nolabel">
                                <input data-v-c019d6aa="" class="placeholder-current p-2" autocomplete="off" placeholder="${t_script.cover.no_volume}" title="No Volume" value="1">
                                <div data-v-c019d6aa="" class="md-border"></div>
                                <label data-v-c019d6aa="" class="md-label">
                                <!---->
                                </label>
                            </div>
                            <!---->
                        </div>
                        <button data-v-6495c397="" data-v-f76e628c="" class="volume-edit rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent !px-0 volume-edit" style="min-height: 2.5rem; min-width: 2.5rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <svg data-v-9ba4cb7e="" data-v-6495c397="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-edit-2 icon" viewBox="0 0 24 24" style="color: currentcolor;">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path>
                                </svg>
                            </span>
                        </button>
                        <!---->
                    </div>
                    <!---->
                </div>
            `
        )

        title.innerText = `Capas (${covers.children.length - 1})`;

        // Obtém a última capa adicionada para adicionar eventos
        const lastCover = covers.firstElementChild;

        if (language) {
            const place = lastCover.querySelector('.placeholder-text');
            const placeHolder = lastCover.querySelector('.with-placeholder');

            if (!place.classList.contains('populated')) {
                place.classList.remove('opacity-40');
                place.classList.add('populated');
                placeHolder.classList.add('populated');
            }

            place.innerText = language.language;
        }

        // Evento para remover a capa ao clicar no botão de fechar
        lastCover.querySelector(".close").addEventListener("click", () => {
            lastCover.remove();
            title.innerText = `${t_script.cover.covers} (${covers.children.length - 1})`; // Atualiza a contagem
        });

        // Evento para marcar/desmarcar como capa principal
        lastCover.querySelector(".main-star").addEventListener("click", (event) => {
            if (event.currentTarget.title === t_script.cover.main_cover) {
                event.currentTarget.title = t_script.cover.set_as_main_cover;
                event.currentTarget.innerHTML = `
                    <svg data-v-9ba4cb7e="" data-v-f76e628c="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-star icon small text-icon-contrast text-undefined" viewBox="0 0 24 24">
                        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path>
                    </svg>
                `;
                return;
            }

            document.querySelectorAll(".main-star").forEach(star => {
                star.title = t_script.cover.set_as_main_cover;
                star.innerHTML = `
                    <svg data-v-9ba4cb7e="" data-v-f76e628c="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-star icon small text-icon-contrast text-undefined" viewBox="0 0 24 24">
                        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path>
                    </svg>
                `;
            });

            event.currentTarget.title = t_script.cover.main_cover;
            event.currentTarget.innerHTML = `
                <svg data-v-9ba4cb7e="" data-v-f76e628c="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-star icon small text-primary" viewBox="0 0 24 24">
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path>
                </svg>
            `;
        });

        // Evento para visualizar a capa em um modal ou nova aba
        lastCover.querySelector(".page-preview-button").addEventListener("click", () => {
            document.querySelector('body').insertAdjacentHTML(
                'beforeend',
                `
                    <div data-v-4f4d9ab1="" data-v-f76e628c="" data-v-d41707fc="" class="md-overlay text-white p-8 flex flex-col items-center justify-center" style="z-index: 100; --7bb2d5fc: 0.7;">
                        <!---->
                        <img data-v-f76e628c="" class="preview" src="${reader.result}" alt="Cover image">
                    </div>
                `
            )

            // Seleciona o modal recém-criado
            const modal = document.querySelector(".md-overlay");

            // Adiciona evento para fechar ao clicar fora da imagem
            modal.addEventListener("click", (event) => {
                if (!event.target.classList.contains("preview")) {
                    modal.remove();
                }
            });
        });
        
        lastCover.querySelector(".md-select").addEventListener("click", (event) => {
            const container = event.currentTarget;

            const place = lastCover.querySelector('.placeholder-text');
            const placeHolder = lastCover.querySelector('.with-placeholder');

            if (container.classList.contains('rounded')) {
                container.classList.replace('rounded', 'rounded-d');
            } else {
                container.classList.replace('rounded-d', 'rounded');
            }

            const languageList = lastCover.querySelector('#list');
            if (languageList.style.display === 'none') {
                languageList.style.removeProperty('display');
                place.classList.add('dropdown-open');
                placeHolder.classList.add('populated');
            } else {
                languageList.style.setProperty('display', 'none');
                place.classList.remove('dropdown-open');
                if (place.textContent.trim() === "Selecionar Linguagem") {
                    placeHolder.classList.remove('populated');
                }
                return;
            }

            const rect = container.getBoundingClientRect();
            const marginEdge = 10; // margem mínima da viewport
            const dropdown = languageList;
        
            // Define left e width com base no container, sem somar scroll
            dropdown.style.left = rect.left + 'px';
            dropdown.style.width = rect.width + 'px';
        
            // Exibe o dropdown (caso esteja oculto) para que possamos calcular o espaço disponível
            if (dropdown.style.display === 'none' || !dropdown.style.display) {
                dropdown.style.display = 'block';
            }
        
            // Calcula o espaço disponível abaixo e acima do container
            const spaceBelow = window.innerHeight - rect.bottom - marginEdge;
            const spaceAbove = rect.top - marginEdge;
        
            // Decisão de posicionamento: escolhe o lado com mais espaço disponível
            if (spaceBelow >= spaceAbove) {
                // Posiciona abaixo do container
                dropdown.style.top = rect.bottom + 'px';
                dropdown.style.bottom = marginEdge + 'px';
                // Limita a altura máxima para caber no espaço disponível abaixo
                dropdown.style.maxHeight = spaceBelow + 'px';
            } else {
                // Posiciona acima do container
                dropdown.style.top = marginEdge + 'px';
                dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
                // Limita a altura máxima para caber no espaço disponível acima
                dropdown.style.maxHeight = spaceAbove + 'px';
            }

            document.addEventListener('click', function (e) {
                if (!container.contains(e.target)) {
                    container.classList.replace('rounded-b', 'rounded');
                    languageList.style.setProperty('display', 'none');
                    place.classList.remove('dropdown-open');
                    if (place.textContent.trim() === "Selecionar Linguagem") {
                        placeHolder.classList.remove('populated');
                    }
                }
            });
        
            document.addEventListener('scroll', function (e) {
                if (!container.contains(e.target)) {
                    container.classList.replace('rounded-b', 'rounded');
                    languageList.style.setProperty('display', 'none');
                    place.classList.remove('dropdown-open');
                    if (place.textContent.trim() === "Selecionar Linguagem") {
                        placeHolder.classList.remove('populated');
                    }
                }
            });

            languageList.querySelectorAll('#list-item').forEach((item) => {
                item.addEventListener('click', function() {
                    const place = lastCover.querySelector('.placeholder-text');
                    const placeHolder = lastCover.querySelector('.with-placeholder');
                    
                    const img = item.querySelector('img');
                    const language = img.title;
                    const flag = img.src;
                    const alt = img.alt;

                    if (!place.classList.contains('populated')) {
                        place.classList.remove('opacity-40');
                        place.classList.add('populated');
                        placeHolder.classList.add('populated');
                    }

                    place.innerText = language;

                    const volumeAccent = lastCover.querySelector('.volume-accent').querySelector('img');
                    volumeAccent.src = flag;
                    volumeAccent.title = language;
                    volumeAccent.alt = alt;


                });
            });
        });

        lastCover.querySelector('input').addEventListener('input', function() {
            let value = this.value.replace(/\D/g, ''); // Remove qualquer caractere que não seja número
        
            if (value.trim() !== "") {
                this.value = value; // Define o valor filtrado

                const volumeAccent = lastCover.querySelector('.volume-accent').querySelector('span');
                volumeAccent.innerText = `${t_script.cover.volume} ${value}`;
            } else {
                this.value = "";
        
                const volumeAccent = lastCover.querySelector('.volume-accent').querySelector('span');
                volumeAccent.innerText = t_script.cover.no_volume;
            }
        });
    };
}