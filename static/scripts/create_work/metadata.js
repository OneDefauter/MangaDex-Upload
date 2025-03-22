let newState;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Função do botão de sinconização de autores e artistas
document.addEventListener('DOMContentLoaded', () => {
    const CheckboxSync = document.getElementById('sync-author-artist-container');
    const SpanSync = CheckboxSync.querySelector('.md-checkbox__wrap');

    CheckboxSync.addEventListener('click', (event) => {
        event.preventDefault();

        // Obtém o estado atual do checkbox pelo atributo "aria-disabled"
        const currentValueAria = CheckboxSync.getAttribute('aria-disabled');
        const isDisabled = currentValueAria === 'true';
        if (isDisabled) {
            return;
        }

        // Obtém o estado atual do checkbox pelo atributo "aria-checked"
        const currentValue = CheckboxSync.getAttribute('aria-checked');
        const isChecked = currentValue === 'true';

        // Atualiza o estado do checkbox
        let newState = !isChecked;
        CheckboxSync.setAttribute('aria-checked', newState);

        if (newState) {
            SpanSync.innerHTML = `
                <svg data-v-9ba4cb7e="" data-v-e5d18c36="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon text-icon-contrast text-undefined">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    <path stroke="rgb(var(--md-primary))" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 11 3 3L22 4"></path>
                </svg>
                <input data-v-e5d18c36="" type="checkbox" id="chk-0.5010099561867369" hidden="" modelvalue="true">
            `;
            ArtistContainerDIV(newState);
        } else {
            SpanSync.innerHTML = `
                <svg data-v-9ba4cb7e="" data-v-e5d18c36="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-square icon text-icon-contrast text-undefined" viewBox="0 0 24 24">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                </svg>
                <input data-v-e5d18c36="" type="checkbox" id="chk-0.004259956422610234" hidden="" modelvalue="false" wfd-id="id69">
            `;
            ArtistContainerDIV(newState);
        }
    });
});


// Função para adicionar o input de adicionar Artista
function ArtistContainerDIV(newState) {
    const ArtistContainer = document.getElementById('artists-container');
    const ArtistHeader = ArtistContainer.querySelector('.header');
    const ArtistInput = ArtistContainer.querySelector('#input-artist');

    if (newState) {
        const req = ArtistHeader.classList.contains('required')
        if (req) {
            ArtistHeader.classList.remove('required');
        } else {
            return;
        }

        ArtistHeader.innerHTML = `
            <div data-v-bb10d586="" class="flex items-center">
                ${t_script.metadata.artists}
                <span data-v-5549140f="" data-v-bb10d586="" class="tt-container">
                    <span data-v-5549140f="" class="trigger">
                        <svg data-v-9ba4cb7e="" data-v-bb10d586="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-link-2 icon text-icon-contrast text-undefined ml-2" viewBox="0 0 24 24">
                            <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3m-1 5h8"></path>
                        </svg>
                    </span>
                    <!---->
                </span>
            </div>
        `;

        ArtistInput.classList.add('disabled');
        ArtistInput.querySelector('.relative')?.remove();
        
    } else {
        const tmp_req = ArtistHeader.classList.contains('required')
        if (tmp_req) { return; }

        ArtistHeader.classList.add('required');
        ArtistHeader.innerHTML = t_script.metadata.artists

        ArtistInput.classList.remove('disabled');
        ArtistInput.insertAdjacentHTML('afterbegin', `
            <div data-v-e827d09f="" class="relative">
                <form data-v-a3d18793="" data-v-e827d09f="" class="md-inputwrap mb-2" action="/titles" method="GET" style="border-radius: 0px;">
                    <input data-v-a3d18793="" class="placeholder-current" placeholder="Procurar artista" title="Procurar artista" name="q" autocomplete="off" value="">
                    <div data-v-a3d18793="" class="md-search-icon">
                        <svg data-v-9ba4cb7e="" data-v-a3d18793="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon text-icon-contrast text-undefined">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m10 2-4.35-4.35"></path>
                        </svg>
                    </div>
                    <div data-v-a3d18793="" class="md-border"></div>
                    <!---->
                </form>
                <div data-v-e827d09f="" class="author-dropdown" style="display: none;">
                    <div data-v-e827d09f="" class="author-tag my-1 cursor-pointer hover-effects">
                        <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-plus icon xSmall text-icon-contrast text-undefined" viewBox="0 0 24 24">
                            <path d="M12 5v14m-7-7h14"></path>
                        </svg>
                        ${t_script.metadata.create}
                    </div>
                </div>
            </div>
        `);

        ArtistInputContainer();
    }
}


// Função para o input de Artista
function ArtistInputContainer() {
    let debounceTimer;
    const ArtistContainer = document.querySelector('#artists-container');
    const Dropdown = ArtistContainer.querySelector('.author-dropdown');
    
    // Função do input do Artista
    ArtistContainer.addEventListener('input', function(event) {
        const value = event.target.value;
        console.log(value);

        // Verifica se o input está vazio
        if (value.length > 0) {
            // Verifica se o input já tem os botões de limpar e de enviar
            if (!event.target.parentElement.querySelector('.md-clear-icon') || !event.target.parentElement.querySelector('.md-go-icon')) {
                event.target.parentElement.insertAdjacentHTML('beforeend', `
                    <div data-v-a3d18793="" tabindex="-1" class="md-search-icon md-clear-icon">
                        <svg data-v-9ba4cb7e="" data-v-a3d18793="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon text-text-white">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                        </svg>
                    </div>
                    <div data-v-a3d18793="" tabindex="-1" class="md-search-icon md-go-icon">
                        <svg data-v-a3d18793="" data-v-9ba4cb7e="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-arrow-right icon text-text-white" viewBox="0 0 24 24">
                            <path d="M5 12h14m-7-7 7 7-7 7"></path>
                        </svg>
                    </div>
                `);
            }

            // Verifica se o dropdown já tem o spinner
            if (!Dropdown.querySelector('circle')) {
                Dropdown.style.removeProperty('display');
                Dropdown.innerHTML = `
                    <div data-v-e827d09f="" class="flex justify-center my-2">
                        <div data-v-0f31f331="" data-v-e827d09f="" class="relative text-primary" indeterminate="" style="width: 3rem; height: 3rem;">
                            <svg data-v-0f31f331="" viewBox="0 0 50 50" class="spinner" style="border-radius: 50%; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">
                                <circle data-v-0f31f331="" fill="transparent" stroke="currentColor" stroke-width="4px" class="line" cx="25" cy="25" r="18" stroke-dasharray="113.097" stroke-linecap="round"></circle>
                            </svg>
                        </div>
                    </div>
                `;
                Dropdown.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                });
            }
        } else {
            // Caso o input esteja vazio, remove os botões de limpar e de enviar
            // e esconde o dropdown
            clearAuthor();
        }
    });

    // Função para quando sair do input do Artista
    // Esconde o dropdown ao sair do input
    ArtistContainer.querySelector('input').addEventListener('blur', function(event) {
        const atc = ArtistContainer.querySelector('.author-dropdown');
        atc.style.setProperty('display', 'none');
    });

    // Função para quando focar no input do Artista
    // Exibe o dropdown se o input não estiver vazio
    ArtistContainer.querySelector('input').addEventListener('focus', function(event) {
        const value = event.target.value;
        const atc = ArtistContainer.querySelector('.author-dropdown');
        if (value.length > 0) {
            atc.style.removeProperty('display');
        }
    });

    // Função para enviar o valor do input do Artista
    // Via socket
    ArtistContainer.addEventListener('input', function(event) {
        const value = event.target.value;

        // Verifica se o valor está vazio
        // Se estiver, não envia nada
        if (value.length === 0) { return; }

        // Limpa o timer anterior sempre que o usuário digitar algo novo
        clearTimeout(debounceTimer);

        // Aguarda 1 segundo após a última digitação
        debounceTimer = setTimeout(() => {
            if (uuidRegex.test(value)) {
                // Se o valor for um UUID, envia pelo socket específico
                socket.emit('search_author_uuid', {'query': value, 'type': 'artist'})
                console.log(t_script.metadata.sent_by_socket_uuid, value);
            } else {
                // Caso contrário, envia pelo socket normal
                socket.emit('search_author', {'query': value, 'type': 'artist'})
                console.log(t_script.metadata.sent_by_regular_socket, value);
            }
        }, 1000);
    });
}


// Função para o input de Autor
document.addEventListener('DOMContentLoaded', () => {
    let debounceTimer;
    const AuthorContainer = document.querySelector('#authors-container');
    const Dropdown = AuthorContainer.querySelector('.author-dropdown');
    
    // Função do input do Autor
    AuthorContainer.addEventListener('input', function(event) {
        const value = event.target.value;
        console.log(value);

        // Verifica se o input está vazio
        if (value.length > 0) {
            // Verifica se o input já tem os botões de limpar e de enviar
            if (!event.target.parentElement.querySelector('.md-clear-icon') || !event.target.parentElement.querySelector('.md-go-icon')) {
                event.target.parentElement.insertAdjacentHTML('beforeend', `
                    <div data-v-a3d18793="" tabindex="-1" class="md-search-icon md-clear-icon">
                        <svg data-v-9ba4cb7e="" data-v-a3d18793="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon text-text-white">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                        </svg>
                    </div>
                    <div data-v-a3d18793="" tabindex="-1" class="md-search-icon md-go-icon">
                        <svg data-v-a3d18793="" data-v-9ba4cb7e="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-arrow-right icon text-text-white" viewBox="0 0 24 24">
                            <path d="M5 12h14m-7-7 7 7-7 7"></path>
                        </svg>
                    </div>
                `);
            }

            // Verifica se o dropdown já tem o spinner
            if (!Dropdown.querySelector('circle')) {
                Dropdown.style.removeProperty('display');
                Dropdown.innerHTML = `
                    <div data-v-e827d09f="" class="flex justify-center my-2">
                        <div data-v-0f31f331="" data-v-e827d09f="" class="relative text-primary" indeterminate="" style="width: 3rem; height: 3rem;">
                            <svg data-v-0f31f331="" viewBox="0 0 50 50" class="spinner" style="border-radius: 50%; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">
                                <circle data-v-0f31f331="" fill="transparent" stroke="currentColor" stroke-width="4px" class="line" cx="25" cy="25" r="18" stroke-dasharray="113.097" stroke-linecap="round"></circle>
                            </svg>
                        </div>
                    </div>
                `;
                Dropdown.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                });
            }
        } else {
            // Caso o input esteja vazio, remove os botões de limpar e de enviar
            // e esconde o dropdown
            clearAuthor();
        }
    });

    // Função para quando sair do input do Autor
    // Esconde o dropdown ao sair do input
    AuthorContainer.querySelector('input').addEventListener('blur', function(event) {
        const atc = AuthorContainer.querySelector('.author-dropdown');
        atc.style.setProperty('display', 'none');
    });

    // Função para quando focar no input do Autor
    // Exibe o dropdown se o input não estiver vazio
    AuthorContainer.querySelector('input').addEventListener('focus', function(event) {
        const value = event.target.value;
        const atc = AuthorContainer.querySelector('.author-dropdown');
        if (value.length > 0) {
            atc.style.removeProperty('display');
        }
    });

    // Função para enviar o valor do input do Autor
    // Via socket
    AuthorContainer.addEventListener('input', function(event) {
        const value = event.target.value;

        // Verifica se o valor está vazio
        // Se estiver, não envia nada
        if (value.length === 0) { return; }

        // Limpa o timer anterior sempre que o usuário digitar algo novo
        clearTimeout(debounceTimer);

        // Aguarda 1 segundo após a última digitação
        debounceTimer = setTimeout(() => {
            if (uuidRegex.test(value)) {
                // Se o valor for um UUID, envia pelo socket específico
                socket.emit('search_author_uuid', {'query': value, 'type': 'author'})
                console.log(t_script.metadata.sent_by_socket_uuid, value);
            } else {
                // Caso contrário, envia pelo socket normal
                socket.emit('search_author', {'query': value, 'type': 'author'})
                console.log(t_script.metadata.sent_by_regular_socket, value);
            }
        }, 1000);
    });
});


socket.on('search_author_response', (data) => {
    if (data.type === 'author') {
        SearchResponseAuthor(data);
    } else if (data.type === 'artist') {
        SearchResponseArtist(data);
    }
});

socket.on('create_author_response', (data) => {
    if (data.type === 'author') {
        CreateResponseAuthor(data);
    } else if (data.type === 'artist') {
        CreateResponseArtist(data);
    }
});


// 
function SearchResponseAuthor(data) {
    const CheckboxSync = document.getElementById('sync-author-artist-container');
    newState = CheckboxSync.getAttribute('aria-checked') === 'true';

    const AuthorContainer = document.querySelector('#authors-container');
    const Dropdown = AuthorContainer.querySelector('.author-dropdown');

    // Filtra os autores que ainda não foram adicionados e coleta até 5
    const choices = [];
    for (let i = 0; i < data.authors.length && choices.length < 5; i++) {
        const item = data.authors[i];
        // Se já existe um elemento com esse data-author-id nos tags, pula
        if (!AuthorContainer.querySelector('#container-tags')?.querySelector(`[data-author-id="${item.id}"]`)) {
            choices.push(item);
        }
    }

    // Monta o HTML do dropdown com os autores filtrados
    let htmlContent = '';
    choices.forEach((item) => {
        htmlContent += `
        <div data-v-e827d09f="" data-author-id="${item.id}" class="author-tag my-1 cursor-pointer hover-effects">
            ${item.name}
        </div>
        `;
    });

    // Adiciona o "botão" Criar
    htmlContent += `
        <div data-v-e827d09f="" id="create-author" class="author-tag my-1 cursor-pointer hover-effects">
            <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" 
                width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" 
                stroke-linejoin="round" stroke-width="2" class="feather feather-plus icon xSmall text-icon-contrast text-undefined" 
                viewBox="0 0 24 24">
                    <path d="M12 5v14m-7-7h14"></path>
            </svg>
            ${t_script.metadata.create}
        </div>
    `;

    // Atualiza o dropdown com os autores filtrados
    Dropdown.innerHTML = htmlContent;

    Dropdown.querySelectorAll('.author-tag[data-author-id]').forEach(authorEl => {
        authorEl.addEventListener('click', () => {
            const authorId = authorEl.getAttribute('data-author-id');
            const authorName = authorEl.textContent.trim();
            console.log(t_script.metadata.clicked_author, authorId + ' - ' + authorName);
            clearAuthor();

    // Remove o texto de "Nenhum selecionado."
    // e adiciona o container de tags, caso não exista
            AuthorContainer.querySelector('p')?.remove();
            if (!AuthorContainer.querySelector('#container-tags')) {
                AuthorContainer.lastElementChild.insertAdjacentHTML(
                    'beforeend',
                    `
                        <div data-v-e827d09f="" id="container-tags" class="flex flex-wrap gap-2 my-2"></div>
                    `
                )
            }

            // Adiciona o autor clicado como tag
            AuthorContainer.lastElementChild.lastElementChild.insertAdjacentHTML(
                'beforeend',
                `
                    <div data-v-e827d09f="" data-author-id="${authorId}" class="author-tag">
                        <div data-v-e827d09f="">${authorName}</div>
                        <div data-v-e827d09f="" class="flex-grow"></div>
                        <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-icon-contrast text-undefined cursor-pointer">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                        </svg>
                    </div>
                `
            )

            // Adiciona a função de remover o autor clicado
            AuthorContainer.querySelector(`[data-author-id="${authorId}"]`).addEventListener('click', () => {
                // Atualiza o estado do CheckboxSync
                newState = CheckboxSync.getAttribute('aria-checked') === 'true';

                AuthorContainer.querySelector(`[data-author-id="${authorId}"]`).remove();
                if (AuthorContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
                    AuthorContainer.querySelector('#container-tags').remove();
                    AuthorContainer.lastElementChild.insertAdjacentHTML(
                        'beforeend',
                        `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
                    );
                }

                // Adiciona a função de remover o artista, caso o CheckboxSync esteja marcado
                if (newState) {
                    const ArtistContainer = document.getElementById('artists-container');
                    ArtistContainer.querySelector(`[data-author-id="${authorId}"]`)?.remove();
                    if (ArtistContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
                        ArtistContainer.querySelector('#container-tags').remove();
                        ArtistContainer.lastElementChild.insertAdjacentHTML(
                            'beforeend',
                            `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
                        );
                    }
                }

                // Compara os containers de autores e artistas
                CompareContainersTags();
            });

            // Adiciona o artista também, caso o CheckboxSync esteja marcado
            if (newState) {
                const ArtistContainer = document.getElementById('artists-container');
                ArtistContainer.querySelector('p')?.remove();
                if (!ArtistContainer.querySelector('#container-tags')) {
                    ArtistContainer.lastElementChild.insertAdjacentHTML(
                        'beforeend',
                        `
                            <div data-v-e827d09f="" id="container-tags" class="flex flex-wrap gap-2 my-2"></div>
                        `
                    )
                }
    
                ArtistContainer.lastElementChild.lastElementChild.insertAdjacentHTML(
                    'beforeend',
                    `
                        <div data-v-e827d09f="" data-author-id="${authorId}" class="author-tag">
                            <div data-v-e827d09f="">${authorName}</div>
                            <div data-v-e827d09f="" class="flex-grow"></div>
                            <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-icon-contrast text-undefined cursor-pointer">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                            </svg>
                        </div>
                    `
                )

                // Adiciona a função de remover o artista
                ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).addEventListener('click', () => {
                    ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).remove();
                    if (ArtistContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
                        ArtistContainer.querySelector('#container-tags').remove();
                        ArtistContainer.lastElementChild.insertAdjacentHTML(
                            'beforeend',
                            `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
                        );
                    }

                    // Compara os containers de autores e artistas
                    CompareContainersTags();
                });
            }

            // Compara os containers de autores e artistas
            CompareContainersTags();
        });
    });

    Dropdown.querySelector('#create-author').addEventListener('click', () => {
        const input = AuthorContainer.querySelector('input');
        const value = input.value.trim();
        if (value.length === 0) { return; }

        // Obter o elemento do modal
        const modal = document.getElementById('crate-author-modal');
        modal.innerHTML = `
            <div data-v-ba360285="" data-v-d41707fc="" class="md-modal__shade"></div>
            <div data-v-ba360285="" data-v-0fd05f8f="" class="md-modal__box flex-grow" style="max-width: 800px; max-height: calc(100% - 3rem);">
                <div data-v-e827d09f="" class="bg-background rounded">
                    <div data-v-e827d09f="" class="flex text-xl px-6 py-4">
                        ${t_script.metadata.authors_create}
                        <button data-v-6495c397="" id="close" class="ml-auto flex-shrink-0 rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent text rounded-full !px-0 ml-auto flex-shrink-0" style="min-height: 2rem; min-width: 2rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <svg data-v-9ba4cb7e="" data-v-6495c397="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon med" style="color: currentcolor;">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                    <div data-v-e827d09f="" class="text-sm px-6 pb-5 first:pt-4">
                        <div data-v-e827d09f="" class="font-bold mb-2">Nome do Autor</div>
                        <div data-v-c019d6aa="" data-v-e827d09f="" class="md-input">
                            <div data-v-c019d6aa="" class="md-inputwrap md-nolabel">
                                <input data-v-c019d6aa="" class="placeholder-current p-4" autocomplete="off" value="${value}">
                                <div data-v-c019d6aa="" class="md-border"></div>
                                <label data-v-c019d6aa="" class="md-label">
                                    <!---->
                                </label>
                            </div>
                            <!---->
                        </div>
                    </div>
                    <div data-v-e827d09f="" class="flex flex-wrap gap-4 items-end p-4 pt-0 justify-end">
                        <button data-v-6495c397="" data-v-e827d09f="" id="cancel" class="rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent" style="min-height: 3rem; min-width: 13.75rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <!---->
                                Cancelar
                            </span>
                        </button>
                        <button data-v-6495c397="" data-v-e827d09f="" id="confirm" class="rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden primary" style="min-height: 3rem; min-width: 13.75rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <!---->
                                Confirmar
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.style.removeProperty('display');

        console.log(t_script.metadata.create_clicked_author);
        clearAuthor();

        // Função para fechar o modal
        modal.querySelector('#close').addEventListener('click', () => {
            // Verifica se o botão de confirmar foi clicado
            const confirm = modal.querySelector('#confirm');
            if (confirm.classList.contains('disabled')) { return; }

            // Fecha o modal
            modal.style.setProperty('display', 'none');
            modal.innerHTML = ``;
        });

        // Função para fechar o modal
        modal.querySelector('#cancel').addEventListener('click', () => {
            modal.style.setProperty('display', 'none');
            modal.innerHTML = ``;
        });

        // Função para confirmar o modal
        modal.querySelector('#confirm').addEventListener('click', () => {
            // Verifica se o input está vazio
            const name = modal.querySelector('.md-input input').value.trim();
            if (name.length === 0) { return; }
            
            // Desabilita os botões de cancelar e confirmar
            const cancel = modal.querySelector('#cancel');
            const confirm = modal.querySelector('#confirm');

            cancel.classList.add('disabled');
            confirm.classList.add('disabled');

            // Adiciona o spinner no botão de confirmar
            confirm.innerHTML = `
                <div data-v-0f31f331="" data-v-6495c397="" class="relative mx-auto z-[1]" style="width: 1.5em; height: 1.5em;">
                    <svg data-v-0f31f331="" viewBox="0 0 50 50" class="spinner" style="border-radius: 50%; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">
                        <circle data-v-0f31f331="" fill="transparent" stroke="currentColor" stroke-width="4px" class="line" cx="25" cy="25" r="18" stroke-dasharray="113.097" stroke-linecap="round"></circle>
                    </svg>
               </div>
            `;

            // Envia o nome do autor para o servidor
            socket.emit('create_author', {'name': name, type: 'author'});
        });
    });
}

function SearchResponseArtist(data) {
    const CheckboxSync = document.getElementById('sync-author-artist-container');
    newState = CheckboxSync.getAttribute('aria-checked') === 'true';

    const ArtistContainer = document.querySelector('#artists-container');
    const Dropdown = ArtistContainer.querySelector('.author-dropdown');

    // Filtra os autores que ainda não foram adicionados e coleta até 5
    const choices = [];
    for (let i = 0; i < data.authors.length && choices.length < 5; i++) {
        const item = data.authors[i];
        // Se já existe um elemento com esse data-author-id nos tags, pula
        if (!ArtistContainer.querySelector('#container-tags')?.querySelector(`[data-author-id="${item.id}"]`)) {
            choices.push(item);
        }
    }

    // Monta o HTML do dropdown com os autores filtrados
    let htmlContent = '';
    choices.forEach((item) => {
        htmlContent += `
        <div data-v-e827d09f="" data-author-id="${item.id}" class="author-tag my-1 cursor-pointer hover-effects">
            ${item.name}
        </div>
        `;
    });

    // Adiciona o "botão" Criar
    htmlContent += `
        <div data-v-e827d09f="" id="create-author" class="author-tag my-1 cursor-pointer hover-effects">
            <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" 
                width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" 
                stroke-linejoin="round" stroke-width="2" class="feather feather-plus icon xSmall text-icon-contrast text-undefined" 
                viewBox="0 0 24 24">
                    <path d="M12 5v14m-7-7h14"></path>
            </svg>
            ${t_script.metadata.create}
        </div>
    `;

    // Atualiza o dropdown com os autores filtrados
    Dropdown.innerHTML = htmlContent;

    Dropdown.querySelectorAll('.author-tag[data-author-id]').forEach(authorEl => {
        authorEl.addEventListener('click', () => {
            const authorId = authorEl.getAttribute('data-author-id');
            const authorName = authorEl.textContent.trim();
            console.log(t_script.metadata.clicked_author, authorId + ' - ' + authorName);
            ClearArtist();

            // Adiciona o autor clicado como tag
            ArtistContainer.querySelector('p')?.remove();
            if (!ArtistContainer.querySelector('#container-tags')) {
                ArtistContainer.lastElementChild.insertAdjacentHTML(
                    'beforeend',
                    `
                        <div data-v-e827d09f="" id="container-tags" class="flex flex-wrap gap-2 my-2"></div>
                    `
                )
            }

            ArtistContainer.lastElementChild.lastElementChild.insertAdjacentHTML(
                'beforeend',
                `
                    <div data-v-e827d09f="" data-author-id="${authorId}" class="author-tag">
                        <div data-v-e827d09f="">${authorName}</div>
                        <div data-v-e827d09f="" class="flex-grow"></div>
                        <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-icon-contrast text-undefined cursor-pointer">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                        </svg>
                    </div>
                `
            )

            // Adiciona a função de remover o autor clicado
            ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).addEventListener('click', () => {
                // Atualiza o estado do CheckboxSync
                newState = CheckboxSync.getAttribute('aria-checked') === 'true';

                ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).remove();
                if (ArtistContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
                    ArtistContainer.querySelector('#container-tags').remove();
                    ArtistContainer.lastElementChild.insertAdjacentHTML(
                        'beforeend',
                        `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
                    );
                }

                // Compara os containers de autores e artistas
                CompareContainersTags();
            });

            // Compara os containers de autores e artistas
            CompareContainersTags();
        });
    });

    Dropdown.querySelector('#create-author').addEventListener('click', () => {
        const input = ArtistContainer.querySelector('input');
        const value = input.value.trim();
        if (value.length === 0) { return; }

        // Obter o elemento do modal
        const modal = document.getElementById('crate-author-modal');
        modal.innerHTML = `
            <div data-v-ba360285="" data-v-d41707fc="" class="md-modal__shade"></div>
            <div data-v-ba360285="" data-v-0fd05f8f="" class="md-modal__box flex-grow" style="max-width: 800px; max-height: calc(100% - 3rem);">
                <div data-v-e827d09f="" class="bg-background rounded">
                    <div data-v-e827d09f="" class="flex text-xl px-6 py-4">
                        ${t_script.metadata.authors_create} 
                        <button data-v-6495c397="" id="close" class="ml-auto flex-shrink-0 rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent text rounded-full !px-0 ml-auto flex-shrink-0" style="min-height: 2rem; min-width: 2rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <svg data-v-9ba4cb7e="" data-v-6495c397="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon med" style="color: currentcolor;">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                    <div data-v-e827d09f="" class="text-sm px-6 pb-5 first:pt-4">
                        <div data-v-e827d09f="" class="font-bold mb-2">Nome do Autor</div>
                        <div data-v-c019d6aa="" data-v-e827d09f="" class="md-input">
                            <div data-v-c019d6aa="" class="md-inputwrap md-nolabel">
                                <input data-v-c019d6aa="" class="placeholder-current p-4" autocomplete="off" value="${value}">
                                <div data-v-c019d6aa="" class="md-border"></div>
                                <label data-v-c019d6aa="" class="md-label">
                                    <!---->
                                </label>
                            </div>
                            <!---->
                        </div>
                    </div>
                    <div data-v-e827d09f="" class="flex flex-wrap gap-4 items-end p-4 pt-0 justify-end">
                        <button data-v-6495c397="" data-v-e827d09f="" id="cancel" class="rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent" style="min-height: 3rem; min-width: 13.75rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <!---->
                                ${t_script.metadata.cancel}
                            </span>
                        </button>
                        <button data-v-6495c397="" data-v-e827d09f="" id="confirm" class="rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden primary" style="min-height: 3rem; min-width: 13.75rem;">
                            <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                <!---->
                                ${t_script.metadata.confirm}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.style.removeProperty('display');

        console.log(t_script.metadata.create_clicked_author);
        clearAuthor();

        // Função para fechar o modal
        modal.querySelector('#close').addEventListener('click', () => {
            // Verifica se o botão de confirmar foi clicado
            const confirm = modal.querySelector('#confirm');
            if (confirm.classList.contains('disabled')) { return; }

            // Fecha o modal
            modal.style.setProperty('display', 'none');
            modal.innerHTML = ``;
        });

        // Função para fechar o modal
        modal.querySelector('#cancel').addEventListener('click', () => {
            modal.style.setProperty('display', 'none');
            modal.innerHTML = ``;
        });

        // Função para confirmar o modal
        modal.querySelector('#confirm').addEventListener('click', () => {
            // Verifica se o input está vazio
            const name = modal.querySelector('.md-input input').value.trim();
            if (name.length === 0) { return; }
            
            // Desabilita os botões de cancelar e confirmar
            const cancel = modal.querySelector('#cancel');
            const confirm = modal.querySelector('#confirm');

            cancel.classList.add('disabled');
            confirm.classList.add('disabled');

            // Adiciona o spinner no botão de confirmar
            confirm.innerHTML = `
                <div data-v-0f31f331="" data-v-6495c397="" class="relative mx-auto z-[1]" style="width: 1.5em; height: 1.5em;">
                    <svg data-v-0f31f331="" viewBox="0 0 50 50" class="spinner" style="border-radius: 50%; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">
                        <circle data-v-0f31f331="" fill="transparent" stroke="currentColor" stroke-width="4px" class="line" cx="25" cy="25" r="18" stroke-dasharray="113.097" stroke-linecap="round"></circle>
                    </svg>
               </div>
            `;

            // Envia o nome do autor para o servidor
            socket.emit('create_author', {'name': name, type: 'artist'});
        });
    });
}


function CreateResponseAuthor(data) {
    const CheckboxSync = document.getElementById('sync-author-artist-container');
    newState = CheckboxSync.getAttribute('aria-checked') === 'true';

    const AuthorContainer = document.querySelector('#authors-container');

    const modal = document.getElementById('crate-author-modal');
    modal.style.setProperty('display', 'none');
    modal.innerHTML = ``;

    clearAuthor();

    if (data.result === null) { return; }

    const authorId = data.result.id;
    const authorName = data.result.name;

    // Remove o texto de "Nenhum selecionado."
    // e adiciona o container de tags, caso não exista
    AuthorContainer.querySelector('p')?.remove();
    if (!AuthorContainer.querySelector('#container-tags')) {
        AuthorContainer.lastElementChild.insertAdjacentHTML(
            'beforeend',
            `
                <div data-v-e827d09f="" id="container-tags" class="flex flex-wrap gap-2 my-2"></div>
            `
        )
    }

    // Adiciona o autor criado como tag
    AuthorContainer.lastElementChild.lastElementChild.insertAdjacentHTML(
        'beforeend',
        `
            <div data-v-e827d09f="" data-author-id="${authorId}" class="author-tag">
                <div data-v-e827d09f="">${authorName}</div>
                <div data-v-e827d09f="" class="flex-grow"></div>
                <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-icon-contrast text-undefined cursor-pointer">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                </svg>
            </div>
        `
    )

    // Adiciona a função de remover o autor clicado
    AuthorContainer.querySelector(`[data-author-id="${authorId}"]`).addEventListener('click', () => {
        // Atualiza o estado do CheckboxSync
        newState = CheckboxSync.getAttribute('aria-checked') === 'true';

        AuthorContainer.querySelector(`[data-author-id="${authorId}"]`).remove();
        if (AuthorContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
            AuthorContainer.querySelector('#container-tags').remove();
            AuthorContainer.lastElementChild.insertAdjacentHTML(
                'beforeend',
                `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
            );
        }

        // Adiciona a função de remover o artista, caso o CheckboxSync esteja marcado
        if (newState) {
            const ArtistContainer = document.getElementById('artists-container');
            ArtistContainer.querySelector(`[data-author-id="${authorId}"]`)?.remove();
            if (ArtistContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
                ArtistContainer.querySelector('#container-tags').remove();
                ArtistContainer.lastElementChild.insertAdjacentHTML(
                    'beforeend',
                    `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
                );
            }
        }

        // Compara os containers de autores e artistas
        CompareContainersTags();
    });

    // Adiciona o artista também, caso o CheckboxSync esteja marcado
    if (newState) {
        const ArtistContainer = document.getElementById('artists-container');
        ArtistContainer.querySelector('p')?.remove();
        if (!ArtistContainer.querySelector('#container-tags')) {
            ArtistContainer.lastElementChild.insertAdjacentHTML(
                'beforeend',
                `
                    <div data-v-e827d09f="" id="container-tags" class="flex flex-wrap gap-2 my-2"></div>
                `
            )
        }

        ArtistContainer.lastElementChild.lastElementChild.insertAdjacentHTML(
            'beforeend',
            `
                <div data-v-e827d09f="" data-author-id="${authorId}" class="author-tag">
                    <div data-v-e827d09f="">${authorName}</div>
                    <div data-v-e827d09f="" class="flex-grow"></div>
                    <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-icon-contrast text-undefined cursor-pointer">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                    </svg>
                </div>
            `
        )

        // Adiciona a função de remover o artista
        ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).addEventListener('click', () => {
            ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).remove();
            if (ArtistContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
                ArtistContainer.querySelector('#container-tags').remove();
                ArtistContainer.lastElementChild.insertAdjacentHTML(
                    'beforeend',
                    `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
                );
            }

            // Compara os containers de autores e artistas
            CompareContainersTags();
        });
    }

    // Compara os containers de autores e artistas
    CompareContainersTags();
}

function CreateResponseArtist(data) {
    const CheckboxSync = document.getElementById('sync-author-artist-container');
    newState = CheckboxSync.getAttribute('aria-checked') === 'true';

    const ArtistContainer = document.querySelector('#artists-container');

    const modal = document.getElementById('crate-author-modal');
    modal.style.setProperty('display', 'none');
    modal.innerHTML = ``;

    clearAuthor();

    if (data.result === null) { return; }

    const authorId = data.result.id;
    const authorName = data.result.name;

    // Remove o texto de "Nenhum selecionado."
    // e adiciona o container de tags, caso não exista
    ArtistContainer.querySelector('p')?.remove();
    if (!ArtistContainer.querySelector('#container-tags')) {
        ArtistContainer.lastElementChild.insertAdjacentHTML(
            'beforeend',
            `
                <div data-v-e827d09f="" id="container-tags" class="flex flex-wrap gap-2 my-2"></div>
            `
        )
    }

    ArtistContainer.lastElementChild.lastElementChild.insertAdjacentHTML(
        'beforeend',
        `
            <div data-v-e827d09f="" data-author-id="${authorId}" class="author-tag">
                <div data-v-e827d09f="">${authorName}</div>
                <div data-v-e827d09f="" class="flex-grow"></div>
                <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon small text-icon-contrast text-undefined cursor-pointer">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                </svg>
            </div>
        `
    )

    // Adiciona a função de remover o autor clicado
    ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).addEventListener('click', () => {
        // Atualiza o estado do CheckboxSync
        newState = CheckboxSync.getAttribute('aria-checked') === 'true';

        ArtistContainer.querySelector(`[data-author-id="${authorId}"]`).remove();
        if (ArtistContainer.querySelector('#container-tags').querySelectorAll('.author-tag').length === 0) {
            ArtistContainer.querySelector('#container-tags').remove();
            ArtistContainer.lastElementChild.insertAdjacentHTML(
                'beforeend',
                `<p data-v-e827d09f="" class="my-4">${t_script.metadata.none_selected}</p>`
            );
        }

        // Compara os containers de autores e artistas
        CompareContainersTags();
    });

    // Compara os containers de autores e artistas
    CompareContainersTags();
}




// Função para limpar o dropdown do Autor
function clearAuthor() {
    // Remove os botões de limpar e de enviar
    // e esconde o dropdown
    const AuthorContainer = document.querySelector('#authors-container');
    const Dropdown = AuthorContainer.querySelector('.author-dropdown');

    const input = AuthorContainer.querySelector('input');
    const clearInput = AuthorContainer.querySelector('.md-clear-icon');
    const goInput = AuthorContainer.querySelector('.md-go-icon');

    if (clearInput) {
        clearInput.remove();
    }
    if (goInput) {
        goInput.remove();
    }

    // Limpa o input
    input.value = '';

    // Esconde o dropdown
    Dropdown.style.setProperty('display', 'none');
    Dropdown.innerHTML = `
        <div data-v-e827d09f="" class="author-tag my-1 cursor-pointer hover-effects">
            <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-plus icon xSmall text-icon-contrast text-undefined" viewBox="0 0 24 24">
            <path d="M12 5v14m-7-7h14"></path>
            </svg>
            ${t_script.metadata.create}
        </div>
    `;
}

// Função para limpar o dropdown do Artista
function ClearArtist() {
    // Remove os botões de limpar e de enviar
    // e esconde o dropdown
    const ArtistContainer = document.querySelector('#artists-container');
    const Dropdown = ArtistContainer.querySelector('.author-dropdown');

    const input = ArtistContainer.querySelector('input');
    const clearInput = ArtistContainer.querySelector('.md-clear-icon');
    const goInput = ArtistContainer.querySelector('.md-go-icon');

    if (clearInput) {
        clearInput.remove();
    }
    if (goInput) {
        goInput.remove();
    }

    // Limpa o input
    input.value = '';

    // Esconde o dropdown
    Dropdown.style.setProperty('display', 'none');
    Dropdown.innerHTML = `
        <div data-v-e827d09f="" class="author-tag my-1 cursor-pointer hover-effects">
            <svg data-v-9ba4cb7e="" data-v-e827d09f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-plus icon xSmall text-icon-contrast text-undefined" viewBox="0 0 24 24">
            <path d="M12 5v14m-7-7h14"></path>
            </svg>
            ${t_script.metadata.create}
        </div>
    `;
}

// Compara os containers de autores e artistas
// Desabilita o checkbox de sincronização caso haja diferença
function CompareContainersTags() {
    const CheckboxSync = document.getElementById('sync-author-artist-container');
    const input = CheckboxSync.querySelector('input');

    // Obtém o estado atual do checkbox pelo atributo "aria-disabled"
    const currentValueAria = CheckboxSync.getAttribute('aria-disabled');
    const isDisabled = currentValueAria === 'true';

    // Containers de autores e artistas
    const AuthorContainer = document.querySelector('#authors-container');
    const ArtistContainer = document.querySelector('#artists-container');

    // Obtém todas as tags de autores e artistas
    const AuthorTags = AuthorContainer.querySelector('#container-tags')?.querySelectorAll('.author-tag') || [];
    const ArtistTags = ArtistContainer.querySelector('#container-tags')?.querySelectorAll('.author-tag') || [];

    // Converte os IDs em conjuntos (Set) para facilitar a comparação
    const AuthorIds = new Set(Array.from(AuthorTags).map(tag => tag.getAttribute('data-author-id')));
    const ArtistIds = new Set(Array.from(ArtistTags).map(tag => tag.getAttribute('data-author-id')));

    console.log("Autores:", [...AuthorIds]);
    console.log("Artistas:", [...ArtistIds]);

    if (AuthorIds.size === 0 && ArtistIds.size === 0) {
        EnableSync();
        return;
    }

    if (AuthorIds.size === 0 || ArtistIds.size === 0) {
        DisableSync();
        console.log(t_script.metadata.empty_container_no_comparison);
        return;
    }

    // Verifica quais autores não estão nos artistas
    const missingInArtists = [...AuthorIds].filter(id => !ArtistIds.has(id));
    // Verifica quais artistas não estão nos autores
    const missingInAuthors = [...ArtistIds].filter(id => !AuthorIds.has(id));

    // Log dos resultados
    if (missingInArtists.length > 0) {
        DisableSync();
        console.log(t_script.metadata.authors_not_in_artists, missingInArtists);
    }
    if (missingInAuthors.length > 0) {
        DisableSync();
        console.log(t_script.metadata.artists_not_in_authors, missingInAuthors);
    }

    if (missingInArtists.length === 0 && missingInAuthors.length === 0) {
        EnableSync();
        console.log(t_script.metadata.all_ids_match);
    }

    function EnableSync() {
        if (!isDisabled) { return; }
        CheckboxSync.classList.remove('opacity-50');
        CheckboxSync.classList.add('cursor-pointer');
        CheckboxSync.setAttribute('aria-disabled', 'false');

        input.setAttribute('modelvalue', 'true');
        input.removeAttribute('disabled');

        CheckboxSync.parentElement.parentElement.querySelector('.tt-container')?.remove();
    }

    function DisableSync() {
        if (isDisabled) { return; }
        CheckboxSync.classList.remove('cursor-pointer');
        CheckboxSync.classList.add('opacity-50');
        CheckboxSync.setAttribute('aria-disabled', 'true');

        input.setAttribute('modelvalue', 'false');
        input.setAttribute('disabled', '');

        if (!CheckboxSync.querySelector('.tt-container')) {
            CheckboxSync.parentElement.parentElement.insertAdjacentHTML(
                'beforeend',
                `
                    <span data-v-5549140f="" data-v-bb10d586="" class="tt-container">
                        <span data-v-5549140f="" class="trigger">
                            <svg data-v-9ba4cb7e="" data-v-5549140f="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon text-icon-contrast text-undefined">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10"></path>
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01"></path>
                            </svg>
                        </span>
                        <!---->
                    </span>
                `
            );
        }
        
    }
}