let titleCount = 0;
let gridContainer = null;

document.addEventListener('DOMContentLoaded', function () {
    AltTitles();
});

function AltTitles() {
    const titleContainer = document.querySelector('#title-alternative');
    const addTitleButton = titleContainer.querySelector('button');

    addTitleButton.addEventListener('click', function () {
        AltTitlesAdd("");
    });

    // Evento para alternar a exibição do title-alternative e o ícone
    document.querySelector("#title-alternative-text-count").addEventListener("click", function () {
        const titleAlternative = document.querySelector("#title-alternative");
        const arrowIcon = this.querySelector(".arrow");

        if (titleCount >= 2) {
            if (titleAlternative.style.display === "none") {
                titleAlternative.style.display = "block";
                arrowIcon.classList.remove("rotate-180");
            } else {
                titleAlternative.style.display = "none";
                arrowIcon.classList.add("rotate-180");
            }
        }
    });
}

function AltTitlesAdd(Title, Language, Flag) {
    const titleContainer = document.querySelector('#title-alternative');
    const addTitleButton = titleContainer.querySelector('button');
    const titleLabel = addTitleButton.closest('.input-container').querySelector('.label > div');
    titleCount++;

    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.setAttribute('data-v-c62c3791', '');
        gridContainer.classList.add('grid', 'grid-cols-1', 'gap-2');
        titleContainer.insertBefore(gridContainer, addTitleButton.closest('.relative.mt-4'));
    }

    const newTitleEntry = document.createElement('div');
    newTitleEntry.setAttribute('data-v-c62c3791', '');
    newTitleEntry.innerHTML = `
        <div data-v-c3aadb04="" data-v-c62c3791="">
            <div data-v-c3aadb04="" class="text-item-container">
                <div data-v-17d188dc="" data-v-c3aadb04="" class="md-select focus:outline-none md-select--no-label" tabindex="0">
                    ${Language ? `
                        <div data-v-c3aadb04="" class="relative whitespace-nowrap flex items-center cursor-pointer select-language">
                            <div data-v-c3aadb04="" class="select-none" style="display: inline-block !important; min-width: 25px; min-height: 24px;">
                                <img title="${Language}" src="${Flag}" alt="${Language} flag icon" width="24" height="24" style="min-width: 25px;">
                                ${Language === "Japanese" || Language === "Korean" || Language === "Chinese (Simplified)" || Language === "Chinese (Traditional)" ? `<img src="/static/flags/kanji.svg" alt="${Language} script icon" width="12" height="12" style="margin-top: -12px; margin-left: auto; margin-right: -2px;">` : ''}
                            </div>
                            <svg data-v-9ba4cb7e="" data-v-c3aadb04="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-down icon text-icon-contrast text-undefined rotating-arrow ml-1" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6"></path>
                            </svg>
                        </div>
                    ` : `
                        <div data-v-c3aadb04="" class="relative whitespace-nowrap flex items-center cursor-pointer select-language">
                            <div data-v-c3aadb04="" class="select-none flag-placeholder" style="display: inline-block !important; min-width: 25px; min-height: 24px;">
                            </div>
                            <svg data-v-9ba4cb7e="" data-v-c3aadb04="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-down icon text-icon-contrast text-undefined rotating-arrow ml-1" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6"></path>
                            </svg>
                        </div>
                    `}
                    <div data-v-17d188dc="" class="language-dropdown fixed overflow-x-hidden overscroll-contain z-10 bg-accent shadow rounded-b" style="bottom: 168.712px; width: 250px; left: 175.562px; top: 236.188px; display: none;">
                        ${[
                            { flag: "/static/flags/jp.svg", script: "/static/flags/kanji.svg", title: "Japanese" },
                            { flag: "/static/flags/jp.svg", script: "/static/flags/latin.svg", title: "Japanese (Romanized)" },
                            { flag: "/static/flags/kr.svg", script: "/static/flags/kanji.svg", title: "Korean" },
                            { flag: "/static/flags/kr.svg", script: "/static/flags/latin.svg", title: "Korean (Romanized)" },
                            { flag: "/static/flags/cn.svg", script: "/static/flags/kanji.svg", title: "Chinese (Simplified)" },
                            { flag: "/static/flags/hk.svg", script: "/static/flags/kanji.svg", title: "Chinese (Traditional)" },
                            { flag: "/static/flags/cn.svg", script: "/static/flags/latin.svg", title: "Chinese (Romanized)" },
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
                            <div data-v-c3aadb04="" class="list-item" tabindex="-1" role="option" data-flag="${lang.flag}" data-title="${lang.title}">
                                <div data-v-c3aadb04="" class="select-none" style="display: inline-block; min-width: 25px; min-height: 24px;">
                                    <img src="${lang.flag}" alt="${lang.title} flag icon" width="24" height="24" style="min-width: 25px;">
                                    ${lang.script ? `<img src="${lang.script}" alt="${lang.title} script icon" width="12" height="12" style="margin-top: -12px; margin-left: auto; margin-right: -2px;">` : ''}
                                </div> ${lang.title}
                            </div>`).join('')}
                    </div>
                </div>
                <div data-v-c3aadb04="" class="bg-current opacity-30" style="min-width: 1px; height: 24px;"></div>
                <div class="relative flex-grow min-w-0">
                    <input data-v-c3aadb04="" class="inline-input" value="${Title}">
                    <div data-v-c3aadb04="" class="absolute top-0 opacity-60 pointer-events-none pl-1 width-full line-clamp-1 break-all"></div>
                </div>
                <svg data-v-9ba4cb7e="" data-v-c3aadb04="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-trash-2 icon text-icon-contrast text-undefined cursor-pointer remove-title" viewBox="0 0 24 24">
                    <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"></path>
                </svg>
            </div>
        </div>
    `;

    gridContainer.appendChild(newTitleEntry);
    titleLabel.textContent = `${t_script.title.title_alternatives} (${titleCount})`;
    ShowHeaderSubtextTitle();

    newTitleEntry.querySelector('.remove-title').addEventListener('click', function () {
        newTitleEntry.remove();
        titleCount--;
        if (titleCount === 0) {
            gridContainer.remove();
            gridContainer = null;
        }
        titleLabel.textContent = `${t_script.title.title_alternatives} (${titleCount})`;
        ShowHeaderSubtextTitle();
    });

    const selectLanguage = newTitleEntry.querySelector('.select-language');
    const languageDropdown = newTitleEntry.querySelector('.language-dropdown');

    selectLanguage.addEventListener('click', function (event) {
        event.stopPropagation();
        document.querySelectorAll('.language-dropdown').forEach(dropdown => {
            if (dropdown !== languageDropdown) {
                dropdown.style.display = 'none';
            }
        });

        const rect = newTitleEntry.getBoundingClientRect();
        const marginEdge = 10; // margem mínima da viewport
        const dropdown = languageDropdown;
    
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

        // languageDropdown.style.display = languageDropdown.style.display === 'none' ? 'block' : 'none';
    });

    languageDropdown.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', function () {
            const flag = item.getAttribute('data-flag');
            const title = item.getAttribute('data-title');

            let script = null;
            if (title.includes("(Romanized)")) {
                script = "/static/flags/latin.svg";
            } else if (title === "Japanese" || title === "Korean" || title === "Chinese (Simplified)" || title === "Chinese (Traditional)") {
                script = "/static/flags/kanji.svg";
            }

            selectLanguage.innerHTML = `
                <div data-v-c3aadb04="" class="select-none" style="display: inline-block !important; min-width: 25px; min-height: 24px;">
                    <img title="${title}" src="${flag}" alt="${title} flag icon" width="24" height="24" style="min-width: 25px;">
                    ${script ? `<img title="${title}" src="${script}" alt="${title} script icon" width="12" height="12" style="margin-top: -12px; margin-left: auto; margin-right: -2px;">` : ''}
                </div>
                <svg data-v-9ba4cb7e="" data-v-c3aadb04="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-down icon text-icon-contrast text-undefined rotating-arrow ml-1" viewBox="0 0 24 24">
                    <path d="m6 9 6 6 6-6"></path>
                </svg>
            `;
            languageDropdown.style.display = 'none';
        });
    });

    document.addEventListener('click', function (event) {
        if (!newTitleEntry.contains(event.target)) {
            languageDropdown.style.display = 'none';
        }
    });

    // Fechar o dropdown ao rolar a página
    document.addEventListener('scroll', function () {
        languageDropdown.style.display = 'none';
    });
}

function ShowHeaderSubtextTitle() {
    const HeaderSubtextTitle = document.querySelector('#header-subtext-title-alternative');
    if (titleCount >= 1) {
        HeaderSubtextTitle.style.display = 'none';
    } else {
        HeaderSubtextTitle.style.display = 'block';
    }

    // Seleciona o elemento onde o ícone deve ser adicionado
    const titleAlternativeTextCount = document.querySelector("#title-alternative-text-count");

    if (titleCount >= 2) {
        titleAlternativeTextCount.classList.add("cursor-pointer");
        // Se já existir o ícone, evita adicionar novamente
        if (!titleAlternativeTextCount.querySelector('.arrow')) {
            titleAlternativeTextCount.insertAdjacentHTML("beforeend", `
                <svg data-v-9ba4cb7e="" data-v-c62c3791="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-up icon text-icon-contrast text-undefined arrow" viewBox="0 0 24 24">
                    <path d="m18 15-6-6-6 6"></path>
                </svg>
            `);
        }
    } else {
        titleAlternativeTextCount.classList.remove("cursor-pointer");
        // Remove o ícone se o titleCount for menor que 2
        const arrowIcon = titleAlternativeTextCount.querySelector('.arrow');
        if (arrowIcon) {
            arrowIcon.remove();
        }
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const DescriptionContainer = document.querySelector('#title-description');
    const addDescriptionButton = DescriptionContainer.closest('.input-container').querySelector('button');
    const DescriptionLabel = addDescriptionButton.closest('.input-container').querySelector('.label > div');
    const HeaderSubtextDescription = document.querySelector('#header-subtext-description');
    const DescriptionModal = document.querySelector('#description-modal');

    const languages = [
        { language: "English", flag: "/static/flags/gb.svg" },
        { language: "Afrikaans", flag: "/static/flags/za.svg" },
        { language: "Albanian", flag: "/static/flags/sq.svg" },
        { language: "Arabic", flag: "/static/flags/sa.svg" },
        { language: "Azerbaijani", flag: "/static/flags/az.svg" },
        { language: "Basque", flag: "/static/flags/eu.svg" },
        { language: "Belarusian", flag: "/static/flags/by.svg" },
        { language: "Bengali", flag: "/static/flags/bd.svg" },
        { language: "Bulgarian", flag: "/static/flags/bg.svg" },
        { language: "Burmese", flag: "/static/flags/mm.svg" },
        { language: "Catalan", flag: "/static/flags/ad.svg" },
        { language: "Chinese (Simplified)", flag: "/static/flags/cn.svg", script: "/static/flags/kanji.svg" },
        { language: "Chinese (Traditional)", flag: "/static/flags/hk.svg", script: "/static/flags/kanji.svg" },
        { language: "Chuvash", flag: "/static/flags/ru-cu.svg" },
        { language: "Croatian", flag: "/static/flags/hr.svg" },
        { language: "Czech", flag: "/static/flags/cz.svg" },
        { language: "Danish", flag: "/static/flags/dk.svg" },
        { language: "Dutch", flag: "/static/flags/nl.svg" },
        { language: "Esperanto", flag: "/static/flags/eo.svg" },
        { language: "Estonian", flag: "/static/flags/et.svg" },
        { language: "Filipino", flag: "/static/flags/ph.svg" },
        { language: "Finnish", flag: "/static/flags/fi.svg" },
        { language: "French", flag: "/static/flags/fr.svg" },
        { language: "Georgian", flag: "/static/flags/ka.svg" },
        { language: "German", flag: "/static/flags/de.svg" },
        { language: "Greek", flag: "/static/flags/gr.svg" },
        { language: "Hebrew", flag: "/static/flags/il.svg" },
        { language: "Hindi", flag: "/static/flags/in.svg" },
        { language: "Hungarian", flag: "/static/flags/hu.svg" },
        { language: "Indonesian", flag: "/static/flags/id.svg" },
        { language: "Irish", flag: "/static/flags/ie.svg" },
        { language: "Italian", flag: "/static/flags/it.svg" },
        { language: "Japanese", flag: "/static/flags/jp.svg", script: "/static/flags/kanji.svg" },
        { language: "Kazakh", flag: "/static/flags/kz.svg" },
        { language: "Korean", flag: "/static/flags/kr.svg", script: "/static/flags/kanji.svg" },
        { language: "Latin", flag: "/static/flags/ri.svg" },
        { language: "Lithuanian", flag: "/static/flags/lt.svg" },
        { language: "Malay", flag: "/static/flags/my.svg" },
        { language: "Mongolian", flag: "/static/flags/mn.svg" },
        { language: "Nepali", flag: "/static/flags/np.svg" },
        { language: "Norwegian", flag: "/static/flags/no.svg" },
        { language: "Persian", flag: "/static/flags/ir.svg" },
        { language: "Polish", flag: "/static/flags/pl.svg" },
        { language: "Portuguese", flag: "/static/flags/pt.svg" },
        { language: "Portuguese (Br)", flag: "/static/flags/br.svg" },
        { language: "Romanian", flag: "/static/flags/ro.svg" },
        { language: "Russian", flag: "/static/flags/ru.svg" },
        { language: "Serbian", flag: "/static/flags/rs.svg" },
        { language: "Slovak", flag: "/static/flags/sk.svg" },
        { language: "Slovenian", flag: "/static/flags/si.svg" },
        { language: "Spanish", flag: "/static/flags/es.svg" },
        { language: "Spanish (LATAM)", flag: "/static/flags/mx.svg" },
        { language: "Swedish", flag: "/static/flags/se.svg" },
        { language: "Tamil", flag: "/static/flags/tam.svg" },
        { language: "Telugu", flag: "/static/flags/tel.svg" },
        { language: "Thai", flag: "/static/flags/th.svg" },
        { language: "Turkish", flag: "/static/flags/tr.svg" },
        { language: "Ukrainian", flag: "/static/flags/ua.svg" },
        { language: "Urdu", flag: "/static/flags/pk.svg" },
        { language: "Uzbek", flag: "/static/flags/uz.svg" },
        { language: "Vietnamese", flag: "/static/flags/vn.svg" }
    ];

    addDescriptionButton.addEventListener('click', function () {
        DescriptionModal.innerHTML = `
            <div data-v-ba360285="" data-v-d41707fc="" class="md-modal__shade no-blur"></div>
            <div data-v-ba360285="" data-v-0fd05f8f="" class="md-modal__box flex-grow" style="max-width: calc(1440px - 3rem); max-height: calc(100% - 3rem);">
                <div data-v-c62c3791="" class="bg-background rounded flex flex-col" style="min-height: 600px;">
                    <div data-v-c62c3791="" class="flex text-xl px-6 py-4">
                        Add Sinopse
                        <button data-v-6495c397="" class="ml-auto flex-shrink-0 rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent text rounded-full !px-0 ml-auto flex-shrink-0" style="min-height: 2rem; min-width: 2rem;">
                        <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                            <svg data-v-9ba4cb7e="" data-v-6495c397="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon med" style="color: currentcolor;">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6 6 18M6 6l12 12"></path>
                            </svg>
                        </span>
                        </button>
                    </div>
                    <div data-v-c62c3791="" class="text-sm px-6 pb-5 first:pt-4">
                        <div data-v-17d188dc="" data-v-c62c3791="" class="md-select focus:outline-none" tabindex="0">
                        <div data-v-17d188dc="" class="md-select-inner-wrap rounded cursor-pointer select-language">
                            <div data-v-17d188dc="" class="md-select__border"></div>
                            <div data-v-17d188dc="" class="flex-grow relative py-[0.3125rem]">
                                <div data-v-17d188dc="" class="mb-1 text-xs h-4"></div>
                                <div data-v-17d188dc="" class="absolute top-4 transition-label with-placeholder">
                                    Sinopse Language <!---->
                                </div>
                                <div data-v-17d188dc="" class="placeholder-text opacity-40 with-label" style="min-height: 1em;">
                                    <!----> Select Language
                                </div>
                            </div>
                            <svg data-v-9ba4cb7e="" data-v-17d188dc="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-down icon text-icon-contrast text-undefined chevron ml-1 flex-shrink-0 my-4 arrow" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6"></path>
                            </svg>
                        </div>
                        <div data-v-17d188dc="" class="language-dropdown fixed overflow-x-hidden overscroll-contain z-10 bg-accent shadow rounded-b" style="display: none;">
                            ${[
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
                                { flag: "/static/flags/cn.svg", script: "/static/flags/kanji.svg", title: "Chinese (Simplified)" },
                                { flag: "/static/flags/hk.svg", script: "/static/flags/kanji.svg", title: "Chinese (Traditional)" },
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
                                { flag: "/static/flags/jp.svg", script: "/static/flags/kanji.svg", title: "Japanese" },
                                { flag: "/static/flags/kz.svg", title: "Kazakh" },
                                { flag: "/static/flags/kr.svg", script: "/static/flags/kanji.svg", title: "Korean" },
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
                                <div data-v-c62c3791="" class="list-item" tabindex="-1" role="option">
                                    <div data-v-c62c3791="" class="select-none" style="display: inline-block !important; min-width: 24px; min-height: 24px;">
                                        <img class="" title="${lang.title}" src="${lang.flag}" alt="${lang.title} flag icon" width="24" height="24"><!---->
                                        ${lang.script ? `<img src="${lang.script}" alt="${lang.title} script icon" width="12" height="12" style="margin-top: -12px; margin-left: auto; margin-right: -2px;">` : ''}
                                    </div>
                                ${lang.title}
                            </div>`).join('')}
                            <!---->
                        </div>
                        <div data-v-17d188dc="" class="md-error-wrap mt-1 mb-2">
                            <div data-v-fc970eed="" data-v-17d188dc="" class="overflow-hidden">
                                <div data-v-17d188dc="" data-v-fc970eed="" style="display: none;"></div>
                            </div>
                        </div>
                        </div>
                        <div data-v-11c6c358="" data-v-c62c3791="" class="mb-4 -mt-2" as-tabs="">
                        <div data-v-11c6c358="" class="mb-2"></div>
                        <div data-v-11c6c358="" class="md--toggle-container">
                            <button data-v-6495c397="" data-v-11c6c358="" class="md--toggle-btn flex-grow rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent-alt md--toggle-btn flex-grow" style="min-height: 2.5rem; min-width: 0px;">
                                <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                    <!----><span data-v-11c6c358="">Edit &amp; Preview</span>
                                </span>
                            </button>
                            <button data-v-6495c397="" data-v-11c6c358="" class="md--toggle-btn flex-grow rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent md--toggle-btn flex-grow" style="min-height: 2.5rem; min-width: 0px;">
                                <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                    <!----><span data-v-11c6c358="">Edit</span>
                                </span>
                            </button>
                            <button data-v-6495c397="" data-v-11c6c358="" class="md--toggle-btn flex-grow rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent md--toggle-btn flex-grow" style="min-height: 2.5rem; min-width: 0px;">
                                <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                                    <!----><span data-v-11c6c358="">Preview</span>
                                </span>
                            </button>
                        </div>
                        </div>
                        <div data-v-c62c3791="" class="grid gap-4 grid-cols-2">
                        <div data-v-3aa7d3d4="" data-v-c62c3791="" class="md-textarea area-edit col-span-1">
                            <div data-v-3aa7d3d4="" class="md-textarea__wrap flex flex-col fill-height" style="min-height: 180px;">
                                <div data-v-3aa7d3d4="" class="md-textarea__border"></div>
                                <div data-v-3aa7d3d4="" class="md-textarea__label-placeholder"></div>
                                <textarea data-v-3aa7d3d4="" class="placeholder-current md-textarea__input p-4 block flex-grow" autocomplete="false" placeholder="" title="Sinopse" role="textbox"></textarea>
                                <label data-v-3aa7d3d4="" class="md-textarea__label">
                                    Sinopse <!---->
                                </label>
                            </div>
                            <!---->
                        </div>
                        <div data-v-c62c3791="" class="p-4 relative border-2 border-accent area-preview col-span-1" style="min-height: 180px; padding-top: 27px;">
                            <div data-v-c62c3791="" class="py-2">
                                <div class="md-md-container"></div>
                            </div>
                            <div data-v-c62c3791="" class="absolute text-xs top-0 pt-2">Preview</div>
                        </div>
                        </div>
                    </div>
                    <div data-v-c62c3791="" class="flex flex-wrap gap-4 items-end p-4 pt-0 justify-end mt-auto">
                        <button data-v-6495c397="" data-v-c62c3791="" class="rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden accent" style="min-height: 3rem; min-width: 13.75rem;">
                        <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                            <!----> Cancel 
                        </span>
                        </button>
                        <button data-v-6495c397="" data-v-c62c3791="" class="rounded custom-opacity relative md-btn flex items-center px-3 overflow-hidden primary" style="min-height: 3rem; min-width: 13.75rem;">
                        <span data-v-6495c397="" class="flex relative items-center justify-center font-medium select-none w-full pointer-events-none" style="justify-content: center;">
                            <!----> Save 
                        </span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        DescriptionModal.style.display = 'block';

        const selectLanguage = DescriptionModal.querySelector('.select-language');
        const languageDropdown = DescriptionModal.querySelector('.language-dropdown');
        let arrowIconDescription = DescriptionModal.querySelector(".arrow");

        selectLanguage.addEventListener('click', function (event) {
            event.stopPropagation();
            document.querySelectorAll('.language-dropdown').forEach(dropdown => {
                if (dropdown !== languageDropdown) {
                    arrowIconDescription.classList.remove("active");
                    dropdown.style.display = 'none';
                }
            });
            languageDropdown.style.display = languageDropdown.style.display === 'none' ? 'block' : 'none';
            if (languageDropdown.style.display === 'block') {
                arrowIconDescription.classList.add("active");
            } else {
                arrowIconDescription.classList.remove("active");
            }
        });

        languageDropdown.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', function () {
                const title = item.innerText.trim();
                const langObj = languages.find(lang => lang.language === title);

                selectLanguage.innerHTML = `
                    <div data-v-17d188dc="" class="md-select__border"></div>
                    <div data-v-17d188dc="" class="flex-grow relative py-[0.3125rem]">
                        <div data-v-17d188dc="" class="mb-1 text-xs h-4"></div>
                        <div data-v-17d188dc="" class="absolute top-4 transition-label populated with-placeholder">
                            Sinopse Language
                            <!---->
                        </div>
                        <div data-v-17d188dc="" class="placeholder-text with-label populated" style="min-height: 1em;">
                            <img
                                class="inline-block select-none"
                                title="${title}"
                                src="${langObj.flag}"
                                alt="${title} flag icon"
                                width="24" height="24">
                            <!---->
                            ${title}
                        </div>
                    </div>
                    <svg data-v-9ba4cb7e="" data-v-17d188dc="" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feather feather-chevron-down icon text-icon-contrast text-undefined chevron ml-1 flex-shrink-0 my-4 arrow" viewBox="0 0 24 24">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                `;
                arrowIconDescription = DescriptionModal.querySelector(".arrow");
                arrowIconDescription.classList.remove("active");
                languageDropdown.style.display = 'none';
            });
        });

        document.addEventListener('click', function (event) {
            if (!DescriptionModal.contains(event.target)) {
                arrowIconDescription.classList.remove("active");
                languageDropdown.style.display = 'none';
            }
        });

        document.addEventListener('scroll', function () {
            arrowIconDescription.classList.remove("active");
            languageDropdown.style.display = 'none';
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const descriptionModal = document.querySelector('#description-modal');

    // Inicializa o Showdown.js para conversão de Markdown para HTML
    const converter = new showdown.Converter({
        tables: true,
        strikethrough: true,
        tasklists: true,
        simplifiedAutoLink: true,
        emoji: true,
        ghMentions: true,
        parseImgDimensions: true
    });

    descriptionModal.addEventListener('click', function (event) {
        const target = event.target.closest('.md--toggle-btn');
        if (!target) return;

        // Obtém os botões
        const buttons = descriptionModal.querySelectorAll('.md--toggle-btn');
        buttons.forEach(btn => btn.classList.remove('accent-alt'));
        buttons.forEach(btn => btn.classList.add('accent'));

        // Ativa o botão clicado
        target.classList.add('accent-alt');

        // Obtém as áreas de edição e preview
        const textAreaContainer = descriptionModal.querySelector('.area-edit');
        const previewAreaContainer = descriptionModal.querySelector('.area-preview');
        const textArea = descriptionModal.querySelector('.md-textarea__input');
        const previewArea = descriptionModal.querySelector('.md-md-container');

        // Lógica para mostrar/esconder as áreas e alterar classes de layout
        if (target.innerText.includes('Edit & Preview')) {
            textAreaContainer.classList.replace('col-span-2', 'col-span-1');
            previewAreaContainer.classList.replace('col-span-2', 'col-span-1');
            textAreaContainer.style.display = 'block';
            previewAreaContainer.style.display = 'block';
        } else if (target.innerText.includes('Edit')) {
            textAreaContainer.classList.replace('col-span-1', 'col-span-2');
            previewAreaContainer.classList.replace('col-span-2', 'col-span-1');
            textAreaContainer.style.display = 'block';
            previewAreaContainer.style.display = 'none';
        } else if (target.innerText.includes('Preview')) {
            textAreaContainer.classList.replace('col-span-2', 'col-span-1');
            previewAreaContainer.classList.replace('col-span-1', 'col-span-2');
            textAreaContainer.style.display = 'none';
            previewAreaContainer.style.display = 'block';
        }
    });

    // Atualizar preview em tempo real
    descriptionModal.addEventListener('input', function (event) {
        const textArea = descriptionModal.querySelector('.md-textarea__input');
        const previewArea = descriptionModal.querySelector('.md-md-container');

        if (event.target === textArea) {
            // Converte Markdown para HTML usando Showdown.js
            previewArea.innerHTML = converter.makeHtml(textArea.value);

            // Adiciona a classe md-textarea--populated se houver texto
            if (textArea.value.trim() !== '') {
                textArea.closest('.area-edit').classList.add('md-textarea--populated');
            } else {
                textArea.closest('.area-edit').classList.remove('md-textarea--populated');
            }
        }
    });
});
