document.addEventListener('DOMContentLoaded', function() {
    // Obtém os dados armazenados na sessionStorage
    const draftData = sessionStorage.getItem("draftData");
    const draftDataOriginalLanguage = sessionStorage.getItem("draftDataOriginalLanguage");

    // Verifica se existe algum dado armazenado
    if (draftData) {
        try {
            const parsedData = JSON.parse(draftData);
            console.log(t_script.data.session_stored_data, parsedData);
        } catch (error) {
            console.error(t_script.data.error_parsing_draft_data, error);
        }
    } else {
        console.log(t_script.data.no_data_saved);
    }

    // Obtém os gêneros do draftData armazenado na sessionStorage
    const parsedData = draftData ? JSON.parse(draftData) : null;
    if (!parsedData) {
        console.error(t_script.data.no_data_saved);
        return;
    }

    if (parsedData.genres) {
        const genresList = parsedData.genres.map(g => g.genre.toLowerCase()); // Converte para minúsculas para comparação

        const TagsAllContainer = document.querySelector("#tags-container-all");
        if (TagsAllContainer) {
            const chips = TagsAllContainer.querySelectorAll(".chip.flex.items-center");

            chips.forEach(chip => {
                const chipText = chip.innerText.trim().toLowerCase(); // Texto do chip

                if (genresList.includes(chipText)) {
                    chip.classList.add("include"); // Adiciona a classe se o gênero estiver na lista
                }
            });
        }
    }

    // Lista de gêneros para verificar
    const targetGenres = ["Shounen", "Shoujo", "Josei", "Seinen"];

    // Encontra o primeiro gênero que esteja na lista
    let foundGenre = parsedData.genres.find(item => targetGenres.includes(item.genre))?.genre || null;

    if (foundGenre) {
        const SelectDemographyContainer = document.querySelector('#demography-container');
        const placeholder = SelectDemographyContainer.querySelector('.placeholder-text.with-label.populated');
        placeholder.innerHTML = foundGenre;
    }

    const title = document.querySelector('#input-title');
    title.value = parsedData.title;

    const YearContainer = document.querySelector('#year-container');
    const YearInput = YearContainer.querySelector('input');
    YearInput.value = parsedData.year;
    YearInput.parentElement.classList.add("md-populated")


    const SelectLanguageContainer = document.querySelector('#tags-language-select');

    const languages = [
        { language: "English", flag: "/static/flags/gb.svg", code: "en" },
        { language: "Afrikaans", flag: "/static/flags/za.svg", code: "af" },
        { language: "Albanian", flag: "/static/flags/sq.svg", code: "sq" },
        { language: "Arabic", flag: "/static/flags/sa.svg", code: "ar" },
        { language: "Azerbaijani", flag: "/static/flags/az.svg", code: "az" },
        { language: "Basque", flag: "/static/flags/eu.svg", code: "eu" },
        { language: "Belarusian", flag: "/static/flags/by.svg", code: "be" },
        { language: "Bengali", flag: "/static/flags/bd.svg", code: "bn" },
        { language: "Bulgarian", flag: "/static/flags/bg.svg", code: "bg" },
        { language: "Burmese", flag: "/static/flags/mm.svg", code: "my" },
        { language: "Catalan", flag: "/static/flags/ad.svg", code: "ca" },
        { language: "Chinese (Simplified)", flag: "/static/flags/cn.svg", code: "zh" },
        { language: "Chinese (Traditional)", flag: "/static/flags/hk.svg", code: "zh-hk" },
        { language: "Chuvash", flag: "/static/flags/ru-cu.svg", code: "cv" },
        { language: "Croatian", flag: "/static/flags/hr.svg", code: "hr" },
        { language: "Czech", flag: "/static/flags/cz.svg", code: "cs" },
        { language: "Danish", flag: "/static/flags/dk.svg", code: "da" },
        { language: "Dutch", flag: "/static/flags/nl.svg", code: "nl" },
        { language: "Esperanto", flag: "/static/flags/eo.svg", code: "eo" },
        { language: "Estonian", flag: "/static/flags/et.svg", code: "et" },
        { language: "Filipino", flag: "/static/flags/ph.svg", code: "fil" },
        { language: "Finnish", flag: "/static/flags/fi.svg", code: "fi" },
        { language: "French", flag: "/static/flags/fr.svg", code: "fr" },
        { language: "Georgian", flag: "/static/flags/ka.svg", code: "ka" },
        { language: "German", flag: "/static/flags/de.svg", code: "de" },
        { language: "Greek", flag: "/static/flags/gr.svg", code: "el" },
        { language: "Hebrew", flag: "/static/flags/il.svg", code: "he" },
        { language: "Hindi", flag: "/static/flags/in.svg", code: "hi" },
        { language: "Hungarian", flag: "/static/flags/hu.svg", code: "hu" },
        { language: "Indonesian", flag: "/static/flags/id.svg", code: "id" },
        { language: "Irish", flag: "/static/flags/ie.svg", code: "ga" },
        { language: "Italian", flag: "/static/flags/it.svg", code: "it" },
        { language: "Japanese", flag: "/static/flags/jp.svg", code: "ja" },
        { language: "Kazakh", flag: "/static/flags/kz.svg", code: "kk" },
        { language: "Korean", flag: "/static/flags/kr.svg", code: "ko" },
        { language: "Latin", flag: "/static/flags/ri.svg", code: "la" },
        { language: "Lithuanian", flag: "/static/flags/lt.svg", code: "lt" },
        { language: "Malay", flag: "/static/flags/my.svg", code: "ms" },
        { language: "Mongolian", flag: "/static/flags/mn.svg", code: "mn" },
        { language: "Nepali", flag: "/static/flags/np.svg", code: "ne" },
        { language: "Norwegian", flag: "/static/flags/no.svg", code: "no" },
        { language: "Persian", flag: "/static/flags/ir.svg", code: "fa" },
        { language: "Polish", flag: "/static/flags/pl.svg", code: "pl" },
        { language: "Portuguese", flag: "/static/flags/pt.svg", code: "pt-pt" },
        { language: "Portuguese (Br)", flag: "/static/flags/br.svg", code: "pt-br" },
        { language: "Romanian", flag: "/static/flags/ro.svg", code: "ro" },
        { language: "Russian", flag: "/static/flags/ru.svg", code: "ru" },
        { language: "Serbian", flag: "/static/flags/rs.svg", code: "sr" },
        { language: "Slovak", flag: "/static/flags/sk.svg", code: "sk" },
        { language: "Slovenian", flag: "/static/flags/si.svg", code: "sl" },
        { language: "Spanish", flag: "/static/flags/es.svg", code: "es" },
        { language: "Spanish (LATAM)", flag: "/static/flags/mx.svg", code: "es-la" },
        { language: "Swedish", flag: "/static/flags/se.svg", code: "sv" },
        { language: "Tamil", flag: "/static/flags/tam.svg", code: "ta" },
        { language: "Telugu", flag: "/static/flags/tel.svg", code: "te" },
        { language: "Thai", flag: "/static/flags/th.svg", code: "th" },
        { language: "Turkish", flag: "/static/flags/tr.svg", code: "tr" },
        { language: "Ukrainian", flag: "/static/flags/ua.svg", code: "uk" },
        { language: "Urdu", flag: "/static/flags/pk.svg", code: "ur" },
        { language: "Uzbek", flag: "/static/flags/uz.svg", code: "uz" },
        { language: "Vietnamese", flag: "/static/flags/vn.svg", code: "vi" }
    ];
    
    const languageInfo = languages.find(lang => lang.code === draftDataOriginalLanguage.replace(/^"+|"+$/g, ''));

    SelectLanguageContainer.querySelector('.placeholder-text.opacity-40.with-label').innerHTML = `
        <img class="inline-block select-none" title="${languageInfo.language}" src="${languageInfo.flag}" alt="${languageInfo.language} flag icon" width="24" height="24">
        <!---->
        ${languageInfo.language}
    `;
    
    SelectLanguageContainer.querySelector('.placeholder-text.opacity-40.with-label').classList.add('populated');
    SelectLanguageContainer.querySelector('.absolute.top-4.transition-label.with-placeholder').classList.add('populated');
    SelectLanguageContainer.classList.add('md-select--populated');



    if (parsedData.completed) {
        const SelectStatusContainer = document.querySelector('#tags-content-status');
        const placeholder = SelectStatusContainer.querySelector('.placeholder-text.opacity-40.with-label');
        if (placeholder) {
            placeholder.innerHTML = 'Completed';
            placeholder.classList.add('populated');
        }
        const label = SelectStatusContainer.querySelector('.absolute.top-4.transition-label.with-placeholder');
        if (label) {
            label.classList.add('populated');
        }
        SelectStatusContainer.classList.add('md-select--populated');
        end_chapter = true;
        Status();

        const regexChapters = /^\d+\s+Chapters/;
        const regexVolumes = /^\d+\s+Volumes/;
        const regexC = /^(\d+)\s+Chapters/;
        const regexV = /^(\d+)\s+Chapters/;

        if (regexChapters.test(parsedData.status)) {
            const EndChapterContainer = document.querySelector('#end-chapter');
            const EndChapterInput = EndChapterContainer.querySelector('#chapter');
            EndChapterInput.parentElement.classList.add("md-populated");

            const match = parsedData.status.match(regexC);
            const firstNumber = parseInt(match[1], 10);

            EndChapterInput.value = firstNumber;

        } else if (regexVolumes.test(parsedData.status)) {
            const EndChapterContainer = document.querySelector('#end-chapter');
            const EndChapterInput = EndChapterContainer.querySelector('#chapter');
            EndChapterInput.parentElement.classList.add("md-populated");

            const EndVolumeContainer = document.querySelector('#end-volume');
            const EndVolumeInput = EndVolumeContainer.querySelector('#volume');
            EndVolumeInput.parentElement.classList.add("md-populated");

            const match = parsedData.status.match(regexV);
            const firstNumber = parseInt(match[1], 10);

            EndVolumeInput.value = firstNumber;
            EndChapterInput.value = parsedData.latest_chapter;
        }
    }

    parsedData.associated.forEach(item => {
        fetch('/create-draft', {
            method: 'POST', // Define o método como POST
            headers: {
                'Content-Type': 'application/json' // Informa que os dados são JSON
            },
            body: JSON.stringify({ // Converte o objeto para JSON
                title: item.title
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP! Status: ${response.status}`);
            }
            return response.json(); // Converte a resposta para JSON
        })
        .then(data => {
            let lg_ = data.language.replace(/^"+|"+$/g, '')
            if (lg_ === "zh-Hant") {
                lg_ = "zh-hk";
            }

            // Lista de idiomas que NÃO devem ser processados
            // const excludedLanguages = ["jp", "ko", "zh", "zh-hk"];
            const excludedLanguages = [];

            const languageInfos = languages.find(lang => lang.code === lg_);

            // Se NÃO estiver na lista de exclusão, adiciona normalmente
            if (!excludedLanguages.includes(languageInfos.code)) {
                AltTitlesAdd(item.title, languageInfos.language, languageInfos.flag);
            } else {
                AltTitlesAdd(item.title, null, null);
            }

            console.log(t_script.data.api_response, data);
        })
        .catch(error => {
            console.error(t_script.data.request_error, error);
            AltTitlesAdd(item.title, null, null);
        });
    });

    const imageUrl = parsedData.image.url.original;
    fetch(`/proxy-image?url=${encodeURIComponent(imageUrl)}`)
        .then(response => response.blob())
        .then(blob => {
            const file = new File([blob], "cover.jpg", { type: blob.type });
            processImage(file, languageInfo);
        })
        .catch(error => console.error(t_script.data.image_loading_error, error));

});