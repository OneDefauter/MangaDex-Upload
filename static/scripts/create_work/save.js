let ISO_639 = {
    'Afrikaans': 'af',
    'Albanian': 'sq',
    'Arabic': 'ar',
    'Azerbaijani': 'az',
    'Basque': 'eu',
    'Belarusian': 'be',
    'Bengali': 'bn',
    'Bulgarian': 'bg',
    'Burmese': 'my',
    'Catalan': 'ca',
    'Chuvash': 'cv',
    'Chinese (Romanized)': 'zh-ro',
    'Chinese (Simplified)': 'zh',
    'Chinese (Traditional)': 'zh-hk',
    'Croatian': 'hr',
    'Czech': 'cs',
    'Danish': 'da',
    'Dutch': 'nl',
    'English': 'en',
    'Esperanto': 'eo',
    'Estonian': 'et',
    'Filipino': 'fil',
    'Finnish': 'fi',
    'French': 'fr',
    'Georgian': 'ka',
    'German': 'de',
    'Greek': 'el',
    'Hebrew': 'he',
    'Hindi': 'hi',
    'Hungarian': 'hu',
    'Indonesian': 'id',
    'Irish': 'ga',
    'Italian': 'it',
    'Japanese': 'ja',
    'Japanese (Romanized)': 'ja-ro',
    'Javanese': 'jv',
    'Kazakh': 'kk',
    'Korean': 'ko',
    'Korean (Romanized)': 'ko-ro',
    'Latin': 'la',
    'Lithuanian': 'lt',
    'Malay': 'ms',
    'Mongolian': 'mn',
    'Nepali': 'ne',
    'Norwegian': 'no',
    'Persian': 'fa',
    'Polish': 'pl',
    'Portuguese': 'pt-pt',
    'Portuguese (Br)': 'pt-br',
    'Romanian': 'ro',
    'Russian': 'ru',
    'Serbian': 'sr',
    'Slovak': 'sk',
    'Slovenian': 'sl',
    'Spanish': 'es',
    'Spanish (LATAM)': 'es-la',
    'Swedish': 'sv',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Thai': 'th',
    'Turkish': 'tr',
    'Ukrainian': 'uk',
    'Urdu': 'ur',
    'Uzbek': 'uz',
    'Vietnamese': 'vi'
};

let draftID = null;
let sXnP = document.getElementById('save-btn').innerHTML;

document.addEventListener('DOMContentLoaded', function() {
    const save = document.getElementById('save-btn');
    const cancel = document.getElementById('cancel-btn');
    save.addEventListener('click', function() {
        if (save.classList.contains('disabled')) {
            return;
        } else {
            save.classList.add('disabled');
            cancel.classList.add('disabled');

            save.innerHTML = `
                <div data-v-0f31f331="" data-v-6495c397="" class="relative mx-auto z-[1]" style="width: 1.5em; height: 1.5em;">
                    <svg data-v-0f31f331="" viewBox="0 0 50 50" class="spinner" style="border-radius: 50%; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">
                        <circle data-v-0f31f331="" fill="transparent" stroke="currentColor" stroke-width="4px" class="line" cx="25" cy="25" r="18" stroke-dasharray="113.097" stroke-linecap="round"></circle>
                    </svg>
               </div>
            `;
        }
        GetRequirements();
    });
    cancel.addEventListener('click', function() {
        window.location.replace("/create-work");
    });
});

function enableSave() {
    const save = document.getElementById('save-btn');
    const cancel = document.getElementById('cancel-btn');

    save.classList.remove('disabled');
    cancel.classList.remove('disabled');
    save.innerHTML = sXnP;
}

function GetRequirements() {
    const Title = document.querySelector('.text-item-container').querySelector('input').value.trim();
    if (Title === '') {
        alert(t_script.save.title_cannot_be_empty);
        enableSave();
        return;
    }
    console.log(t_script.save.title, Title);

    const TitleAlternativeAll = document.querySelector('#title-alternative').querySelector('.grid.grid-cols-1.gap-2');
    console.log(t_script.save.title_alternative_all, TitleAlternativeAll);

    let TitleAlternative = {};
    if (TitleAlternativeAll) {
        TitleAlternativeAll.querySelectorAll('.text-item-container').forEach((item, index) => {
            const value = item.querySelector('input').value.trim();
            const languageName  = item.querySelector('img').title;
            if (value === '') {
                alert(t_script.save.alternative_title_cannot_be_empty);
                enableSave();
                return;
            }

            // Converte o nome do idioma para o código correspondente
            const langCode = ISO_639[languageName] || languageName;

            if (langCode === '') {
                alert(t_script.save.language_cannot_be_empty);
                enableSave();
                return;
            }

            // Se já existir um título para esse langCode, adiciona ao array; caso contrário, cria um novo array
            if (TitleAlternative[langCode]) {
                TitleAlternative[langCode].push(value);
            } else {
                TitleAlternative[langCode] = [value];
            }
        });
    }

    console.log(t_script.save.title_alternative, TitleAlternative);

    const LanguageSelect = document.querySelector('#tags-language-select').querySelector('.placeholder-text').innerText.trim();
    if (LanguageSelect === '') {
        alert(t_script.save.language_cannot_be_empty);
        enableSave();
        return;
    }

    if (LanguageSelect === t_script.save.select_language) {
        alert(t_script.save.select_a_language);
        enableSave();
        return;
    }

    const langCode_ = ISO_639[LanguageSelect] || LanguageSelect;

    console.log(t_script.save.original_language, LanguageSelect);
    console.log(t_script.save.language_code, langCode_);

    const ContentClassification = document.querySelector('#tags-content-classification').querySelector('.placeholder-text').innerText.trim();
    if (ContentClassification === '') {
        alert(t_script.save.content_rating_cannot_be_empty);
        enableSave();
        return;
    }

    if (ContentClassification === t_script.save.select_rating) {
        alert(t_script.save.select_content_rating);
        enableSave();
        return;
    }

    console.log(t_script.save.content_rating, ContentClassification);

    const ContentStatus = document.querySelector('#tags-content-status').querySelector('.placeholder-text').innerText.trim();
    if (ContentStatus === '') {
        alert(t_script.save.content_status_cannot_be_empty);
        enableSave();
        return;
    }

    if (ContentStatus === t_script.save.select_status) {
        alert(t_script.save.select_content_status);
        enableSave();
        return;
    }

    console.log(t_script.save.content_status, ContentStatus);

    let volume = '', chapter = '';
    if (ContentStatus === 'Completed' || ContentStatus === 'Cancelled') {
        const EndChapter = document.querySelector('#end-chapter');
        const inputs = EndChapter.querySelectorAll('input');
    
        // inputs[0] -> primeiro input (Volume)
        // inputs[1] -> segundo input (Capítulo)
        if (inputs.length >= 2) {
            const volume = inputs[0].value.trim();
            const chapter = inputs[1].value.trim();

            if (!volume && !chapter) {
                alert(t_script.save.volume_and_chapter_cannot_be_empty);
                enableSave();
                return;
            } else if (!chapter) {
                alert(t_script.save.chapter_cannot_be_empty);
                enableSave();
                return;
            }

            console.log(t_script.save.volume, volume);
            console.log(t_script.save.chapter, chapter);
        }
    }

    const TagsAll = document.querySelector('#tags-container-all');

    let Tags = [];
    TagsAll.querySelectorAll('.include').forEach(item => {
        const tagName = item.innerText.trim();
        
        // Pega o ID da tag
        const tagId = getTagId(tagName);
        console.log({ id: tagId, name: tagName });
        console.log('---');
      
        // Se quiser armazenar no array, por exemplo
        Tags.push(tagId);
    });
    console.log('Tags:', Tags);

    // Containers de autores e artistas
    const AuthorContainer = document.querySelector('#authors-container');
    const ArtistContainer = document.querySelector('#artists-container');

    // Obtém todas as tags de autores e artistas
    const AuthorTags = AuthorContainer.querySelector('#container-tags')?.querySelectorAll('.author-tag') || [];
    const ArtistTags = ArtistContainer.querySelector('#container-tags')?.querySelectorAll('.author-tag') || [];

    // Converte os IDs em conjuntos (Set) para facilitar a comparação
    const AuthorIds = new Set(Array.from(AuthorTags).map(tag => tag.getAttribute('data-author-id')));
    const ArtistIds = new Set(Array.from(ArtistTags).map(tag => tag.getAttribute('data-author-id')));

    console.log(t_script.save.authors, [...AuthorIds]);
    console.log(t_script.save.artists, [...ArtistIds]);

    if (AuthorIds.size === 0) {
        alert(t_script.save.add_at_least_one_author);
        enableSave();
        return;
    }

    if (ArtistIds.size === 0) {
        alert(t_script.save.add_at_least_one_artist);
        enableSave();
        return;
    }

    const year = document.querySelector('#year-container').querySelector('input').value.trim();
    console.log(t_script.save.year, year);

    const draftData = sessionStorage.getItem("draftData");
    const parsedData = JSON.parse(draftData);
    const genresList = parsedData.genres.map(g => g.genre.toLowerCase());

    // Lista de gêneros para verificar
    const targetGenres = ["shounen", "shoujo", "josei", "seinen"];

    // Encontra o primeiro gênero que esteja na lista
    let foundGenre = genresList.find(genre => targetGenres.includes(genre)) || null;

    console.log(t_script.save.genre_found, foundGenre);

    const covers = document.getElementById('covers-container');
    covers.querySelectorAll('.page').forEach((page) => {
        const img = page.querySelector('.volume-accent img');
        if (!page.classList.contains('no-cover')) {
            const language = img.title;
            if (language === "Other") {
                alert(t_script.save.select_cover_language);
                enableSave();
            }
        }
    });

    socket.on('create_draft_response', function(data) {
        const covers = document.getElementById('covers-container');
        // Seleciona apenas as páginas que não possuem a classe "no-cover"
        const validPages = covers.querySelectorAll('.page:not(.no-cover)');
        const isOnlyCover = validPages.length === 1;
    
        validPages.forEach((page) => {
            const imageData = getBase64ImageFromPage(page);
            if (!imageData) {
                console.error(t_script.save.error_getting_base64_image);
                enableSave();
                return;
            }
            
            // Se houver apenas uma capa, force a capa principal
            if (isOnlyCover) {
                imageData.main = true;
            }
        
            // Converter base64 para arquivo
            const byteCharacters = atob(imageData.base64);
            const byteNumbers = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([byteNumbers], { type: imageData.mimeType });
            const file = new File([blob], "cover.jpg", { type: imageData.mimeType });
        
            // Criar FormData e enviar a requisição
            const formData = new FormData();
            formData.append("file", file);
            formData.append("volume", imageData.volume);
            formData.append("description", '');
            formData.append("locale", imageData.lang);
            formData.append("isMain", imageData.main);
            formData.append("workId", data.id);
        
            console.log("Enviando capa");
            fetch(`/api/upload/cover`, {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => console.log(t_script.save.upload_successful, data))
            .catch(error => console.error(t_script.save.upload_error, error));
        });
    });    

    data = {
        "title": {
            "en": Title
        },
        "altTitles": Object.entries(TitleAlternative).map(([key, values]) => {
            return values.map(value => ({ [key]: value }));
        }).flat(),  // Garante que seja um array de objetos sem arrays aninhados
        "description": {},
        "authors": [...AuthorIds],
        "artists": [...ArtistIds],
        "links": {},
        "originalLanguage": langCode_,
        "lastVolume": volume,
        "lastChapter": chapter,
        "publicationDemographic": foundGenre,
        "status": ContentStatus.toLowerCase(),
        "year": year ? parseInt(year, 10) : null,
        "contentRating": ContentClassification.toLowerCase(),
        "tags": Tags,
    }

    // Garante que a URL do MangaUpdates está presente
    if (parsedData.url) {
        const extractedId = extractId(parsedData.url); // Extrai o ID do link
        if (extractedId) {
            data.links["mu"] = extractedId; // Adiciona no JSON na chave "mu"
        }
    }

    socket.emit('create_draft', data);
    console.log(data);
}

function getBase64ImageFromPage(page) {
    let pageElement = page;
    
    if (pageElement) {
        const style = window.getComputedStyle(pageElement);
        const backgroundImage = style.backgroundImage;
        const language = pageElement.querySelector('img').title;
        let volumeText = pageElement.querySelector('span').innerText;
        const main = pageElement.querySelector(".main-star").title;
        let isMain = false;

        if (main === t_script.save.main_cover) {
            isMain = true;
        }

        const langCode = ISO_639[language] || null;

        // **Expressão Regular para Extrair Apenas o Número**
        const volumeMatch = volumeText.match(/\d+/); // Captura apenas números
        const volume = volumeMatch ? volumeMatch[0] : null; // Se encontrar, usa o número; senão, null

        // Verifica se há uma imagem em base64 no background
        const base64Match = backgroundImage.match(/url\("?data:image\/(png|jpeg|jpg);base64,([^"]+)"?\)/);
        
        if (base64Match) {
            const base64Data = base64Match[2]; // Pega o conteúdo base64
            const mimeType = `image/${base64Match[1]}`; // Define o tipo da imagem
            
            return { base64: base64Data, mimeType: mimeType, lang: langCode, volume: volume, main: isMain };
        }
    }

    console.error(t_script.save.no_base64_image_found);
    return null;
}

// Função para extrair o ID da URL
function extractId(input) {
    const regex = /(?:https?:\/\/)?(?:www\.)?mangaupdates\.com\/series\/([a-zA-Z0-9]{7})/;
    const match = input.match(regex);
    return match ? match[1] : null;
}

socket.on('create_draft_response_cover', function(result) {
    const mainContainer = document.querySelector('.md-content.flex-grow');
    const afterSave = document.querySelector('#after-save');

    draftID = result;

    mainContainer.style.display = 'none';
    afterSave.style.display = 'flex';
});

function verificarRascunho() {
    window.open(`https://mangadex.org/title/edit/${draftID}?draft=true`, '_blank');
}
function irParaRascunhos() {
    window.open('https://mangadex.org/titles/drafts', '_blank');
}
function enviarRascunho() {
    if (!draftID) {
        alert(t_script.save.draft_not_created);
        return;
    }

    socket.emit('send_draft', draftID);
    alert(t_script.save.draft_sent_successfully);
    window.location.replace("/create-work");
}