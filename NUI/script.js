////////////////////////////////////////////////

const body = document.body;
let opened = false;
let currentContainer = ''

function dragBody() {
    if (!opened) {
        return
    }
    let isDragging = false;
    let offsetX, offsetY;

    body.addEventListener('mousedown', (e) => {
        if (currentContainer === 'config') {
            return
        }
        isDragging = true;
        offsetX = e.clientX - body.getBoundingClientRect().left;
        offsetY = e.clientY - body.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            body.style.left = `${e.clientX - offsetX}px`;
            body.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

let playersData = {};
let playersCollected = 0;
let list = {

    reportsList: {},
    suspectsList: {},
    registersList: {},

    rolesList: {},
    inventoryList: {},
    vehicleList: {},
    weaponsList: {},
    resourcesList: {},
    graphList: {},
    banList: {},
    staffsList: {}
}

let onlinePlayersQuantity = 0
let onlineAdminsQuantity = 0

let currentPlayerId = 0
let currentBanId = 0
let currentReportId = 0
let currentSuspectId = 0

let containerUpdated = false

let currentPageLoading = 1
const itemsPerPage = 100
let maxPages = 1

let myId = 0
let myName = ''
let spawnId = 0

let messages = [];
let currentReportMessages = {}

let config = {
    scriptCfg: {},
    notify: true,
    sounds: true,
    realTimeNotify: false,
}

let myReports = {}
let currentMyReportId = 0

async function addImage() {
    var imageUrl = await showPopup('input', 'Coloque o link da Imagem', '');
    if (imageUrl) {
        const imagesContainer = document.getElementById('reportImages-container');

        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');

        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.classList.add('reportsImage');

        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-button');
        removeButton.textContent = 'X';

        removeButton.addEventListener('click', () => {
            imagesContainer.removeChild(imageWrapper);
        });

        imageWrapper.appendChild(imageElement);
        imageWrapper.appendChild(removeButton);
        imagesContainer.appendChild(imageWrapper);
    }
}

async function finishReport() {
    const imagesContainer = document.getElementById('reportImages-container');
    const imageElements = imagesContainer.querySelectorAll('img');
    const imageUrls = Array.from(imageElements).map(img => img.src);

    const reportType = document.getElementById('report-type').value;
    const description = document.getElementById('newMessage').value;

    const confirm = await showPopup('message', 'Deseja enviar o reporte?');
    if (confirm) {
        if (!description) {
            showNotification('error', 'Adicione uma descrição.');
            return
        }
        showNotification('success', 'Seu reporte foi registrado. Aguarde até algum staff lhe responder.');

        $.post('http://arc.Panel/createReport', JSON.stringify({
            description: description,
            images: imageUrls,
            type: reportType
        }));
        closeReport()
    }
}

async function openMyReport(reportId) {
    $.post('http://arc.Panel/updateReports', JSON.stringify({reportId}));
    containerUpdated = false
    await waitForUpdate()
    const background = document.getElementById('reportsBackground-container');
    currentMyReportId = reportId
    playAudio('click');
    background.innerHTML = `
    <div class="management">
        <div class="titleBox">
            <h1>Meus Reports</h1>
        </div>
        <div class="card-flex" style="margin-bottom:20px">
            <div class="card-item">
                <button class="card-btn red" onclick="closeReport()">
                    Sair
                </button>
            </div>
            <div class="card-item">
                <button class="card-btn yellow" onclick="seeReports()">
                    Voltar
                </button>
            </div>
        </div>
        <div class="section-container">
            <h2>Report Atual: ${currentMyReportId} <button class="toggle-btn white" onclick="toggleSection('currentReport-container')">Expandir</button></h2>
            <div id="currentReport-container" style="display:none">
                <div class="new-card">
                    <div class="card-grid">
                        <div class="card-item">
                            <label>Player:</label>
                            <p class="white">${myReports[currentMyReportId].authorName} [${myReports[currentMyReportId].author}]</p>
                        </div>
                        <div class="card-item">
                            <label>Descrição:</label>
                            <p class="white">${myReports[currentMyReportId].description}</p>
                        </div>
                        <div class="card-item">
                            <label>Data:</label>
                            <p class="white">${myReports[currentMyReportId].date}</p>
                        </div>
                        <div class="card-item">
                            <label>Concluido:</label>
                            <p class="white">${myReports[currentMyReportId].concluded ? 'Sim' : 'Não'}</p>
                        </div>
                        ${myReports[currentMyReportId].concluded ? `
                        <div class="card-item">
                            <label>Concluido Por:</label>
                            <p class="white">${myReports[currentMyReportId].concluded.author}</p>
                        </div>
                        <div class="card-item">
                            <label>Data de Conclusão:</label>
                            <p class="white">${myReports[currentMyReportId].concluded.date}</p>
                        </div>
                        ` : ''}
                        ${myReports[currentMyReportId].images ? ` ${myReports[currentMyReportId].images.map((image, index) => `
                        <button class="toggle-btn white" onclick="zoomImage('${image}')">Imagem ${index + 1}</button>`).join('')}` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Campo para criar nova mensagem -->
        <div id="message-creator" class="section-container">
            <label for="newMessage">Escreva sua mensagem:</label>
            <textarea id="newMessage" class="search-bar" placeholder="Digite sua mensagem aqui..." rows="3"></textarea>
            <button id="messageButton" class="card-btn green" onclick="sendMessage(2, ${currentMyReportId})">Enviar Mensagem</button>
        </div>

        <div class="section-container">
            <div class="new-card">
                <h2>Histórico de Mensagens</h2>
                <div id="reportMessageHistory" class="message-history">
                </div>
            </div>
        </div>
    </div>
    `

    displayMyReportMessages(reportId)
}

function displayMyReportMessages(reportId) {
    currentReportMessages = myReports[reportId].messages
    const messageHistory = document.getElementById('reportMessageHistory');
    if (!messageHistory) {
        return
    }
    messageHistory.innerHTML = '';
    var msgColor = 'rgb(240, 211, 17)'
    var backgroundColor = 'rgba(255, 188, 97, 0.1)'
    Object.values(currentReportMessages).forEach((msg, index) => {
        if (msg.author === myId) {
            msgColor = 'rgb(0, 255, 255)'
            backgroundColor = 'rgba(97, 121, 255, 0.1)'
        }
        const messageElement = `
            <div class="message-card" style="border-left: 5px solid ${msgColor}; padding-left: 10px; background-color: ${backgroundColor}">
                <p class="message-info">
                    <span class="message-author" style="color:${msgColor}" onclick="updatePlayer('${msg.author}')">
                        ${msg.name} [${msg.author}]:
                    </span>
                    <span class="message-text">${msg.message}</span>
                </p>
                <p class="message-date">${msg.date} às ${msg.time}</p>
            </div>
        `;
        messageHistory.innerHTML += messageElement;
    });

    messageHistory.scrollTo({
        top: messageHistory.scrollHeight,
        behavior: 'smooth'
      });

    const messages = document.querySelectorAll('.message-text')
    copyText(messages)
}

function seeReports() {
    const background = document.getElementById('reportsBackground-container');
    playAudio('click');
    background.innerHTML = `
    <div class="management">
        <div class="titleBox">
            <h1>Meus Reports</h1>
        </div>
        <div class="card-flex" style="margin-bottom:20px">
            <div class="card-item">
                <button class="card-btn red" onclick="closeReport()">
                    Sair
                </button>
            </div>
            <div class="card-item">
                <button class="card-btn yellow" onclick="buildReport()">
                    Voltar
                </button>
            </div>
        </div>

        <div class="section-container" style="max-height: 400px; overflow: auto;">
            <h2 class="yellow">Reports não Concluídos: ${Object.values(myReports).filter(report => !report.concluded).length} <button class="toggle-btn yellow" onclick="toggleSection('nonConcludedReports-container')">Expandir</button></h2>
            <div id="nonConcludedReports-container" style="display:none">
                ${Object.keys(myReports).filter(reportId => !myReports[reportId].concluded).map(reportId => {
                return `
                <div class="new-card" data-reportid="${reportId}" data-type="${myReports[reportId].type}">
                    <div class="card-grid">
                        <div class="card-item">
                            <label>Report Id:</label>
                            <p class="yellow">${reportId}</p>
                        </div>
                        <div class="card-item">
                            <label>Player:</label>
                            <p class="yellow">${myReports[reportId].authorName} [${myReports[reportId].author}]</p>
                        </div>
                        <div class="card-item">
                            <label>Tipo:</label>
                            <p class="yellow">${myReports[reportId].type}</p>
                        </div>
                        <div class="card-item">
                            <label>Descrição:</label>
                            <p class="yellow">${myReports[reportId].description}</p>
                        </div>
                        <div class="card-item">
                            <label>Data:</label>
                            <p class="yellow">${myReports[reportId].date}</p>
                        </div>
                        <div class="card-item">
                            <button class="card-btn yellow" onclick="openMyReport(${reportId})">
                                Abrir Chat
                            </button>
                        </div>
                    </div>
                </div>`}).join('')}
            </div>
        </div>

        <div class="section-container" style="max-height: 400px; overflow: auto;">
            <h2 class="green">Reports Concluídos: ${Object.values(myReports).filter(report => report.concluded).length} <button class="toggle-btn green" onclick="toggleSection('ConcludedReports-container')">Expandir</button></h2>
            <div id="ConcludedReports-container" style="display:none">
                ${Object.keys(myReports).filter(reportId => myReports[reportId].concluded).map(reportId => {
                return `
                <div class="new-card" data-reportid="${reportId}" data-id="${myReports[reportId].playerId}" data-type="${myReports[reportId].type}">
                    <div class="card-grid">
                        <div class="card-item">
                            <label>Report Id:</label>
                            <p class="green">${reportId}</p>
                        </div>
                        <div class="card-item">
                            <label>Player:</label>
                            <p class="green" style="cursor: pointer" onclick="updatePlayer('${myReports[reportId].author}')">${myReports[reportId].authorName} [${myReports[reportId].author}]</p>
                        </div>
                        <div class="card-item">
                            <label>Tipo:</label>
                            <p class="green">${myReports[reportId].type}</p>
                        </div>
                        <div class="card-item">
                            <label>Concluido Por:</label>
                            <p class="green">${myReports[reportId].concluded.author}</p>
                        </div>
                        <div class="card-item">
                            <label>Data de Conclusão:</label>
                            <p class="green">${myReports[reportId].concluded.date}</p>
                        </div>
                        <div class="card-item">
                            <label>Descrição:</label>
                            <p class="green">${myReports[reportId].description}</p>
                        </div>
                        <div class="card-item">
                            <label>Data:</label>
                            <p class="green">${myReports[reportId].date}</p>
                        </div>
                        <div class="card-item">
                            <button class="card-btn green" onclick="openMyReport(${reportId})">
                                Abrir Chat
                            </button>
                        </div>
                    </div>
                </div>`}).join('')}
            </div>
        </div>
    </div>
    `
}

async function buildReport() {
    $.post('http://arc.Panel/updateReports', JSON.stringify({}));
    containerUpdated = false
    await waitForUpdate()
    var container = document.querySelector('.container')
    if (!container) {
        container = document.createElement('div');
        container.classList.add('container'); 
    }
    container.style.width = '600px';
    container.style.height = '800px';
    container.style.border = '1px solid white';

    var background = document.getElementById('reportsBackground-container') 
    if (!background)  {
        background = document.createElement('div');
        background.classList.add('createReport-background');
        background.id = 'reportsBackground-container'
    }

    function createElement(tag, className = '', textContent = '', id) {
        const element = document.createElement(tag);
        if (id) { element.id = id; }
        if (className) element.classList.add(className);
        if (textContent) element.textContent = textContent;
        return element;
    } 

    function createSelect(id, options) {
        const select = createElement('select', '', '', id);
        select.style.width = '100%';
        options.forEach(optionText => {
            const option = createElement('option', '', optionText);
            option.value = optionText;
            select.appendChild(option);
        });
        return select;
    }
    
    playAudio('click');
    background.innerHTML = `
        <div class="management">
            <div class="titleBox">
                <h1>Registrar Report</h1>
            </div>
            <div class="card-flex" style="margin-bottom:20px">
            <div class="card-item">
                <button class="card-btn red" onclick="closeReport()">
                    Sair
                </button>
            </div>
        </div>

            <div class="section-container" style="background-color: rgba(0, 10, 31, 0.7)">
                <label for="newMessage">Descreva os acontecimentos:</label>
                <textarea id="newMessage" class="search-bar" placeholder="Digite os acontecimentos aqui..." rows="3"></textarea>
            </div>

            <div class="section-container" style="background-color: rgba(0, 10, 31, 0.7); display:flex; flex-direction: column; align-items: center; justify-content: center;">
                <label for="report-type">Selecione o tipo de report:</label>
                <div id="report-type-container"></div>
            </div>

            <div class="card-flex">
                <div class="card-item">
                    <button class="card-btn blue" onclick="addImage()">
                        Adicionar Imagem
                    </button>
                </div>
                <div class="card-item">
                    <button class="card-btn green" onclick="finishReport()">
                        Enviar Report
                    </button>
                </div>
                <div class="card-item">
                    <button class="card-btn white" onclick="seeReports()">
                        Ver meus Reports
                    </button>
                </div>
            </div>

            <div class="card-flex" id="reportImages-container">
            </div>
        </div>
    `;

    const selectContainer = background.querySelector('#report-type-container');
    const select = createSelect('report-type', ['Hack', 'Glitch', 'Doações', 'Anti RP', 'Quebra de Regras', 'Abuso de Poder', 'Outros']);
    selectContainer.appendChild(select);

    container.appendChild(background);
    document.body.appendChild(container);
}

function closeReport() {
    const container = document.querySelector('.container');
    if (container) {
        container.remove();
        $.post('http://arc.Panel/leaveReportCreation', JSON.stringify({}));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('message', function(event) {
        const type = event.data.type;

        if (type === 'spawn') {
            myId = event.data.myId
            myName = event.data.myName
        }

        if (type === 'report') {
            if (event.data.toggle) {
                currentMyReportId = 0
                const container = document.querySelector('.container');
                if (container) {
                    container.remove();
                }
                buildReport()
            } else {
                closeReport()
            }
        }

        const pData = event.data.playersData;
        const pCollected = event.data.playersCollected;

        if (event.data.onlinePlayersQuantity || event.data.onlineAdminsQuantity) {
            onlinePlayersQuantity = event.data.onlinePlayersQuantity;
            onlineAdminsQuantity = event.data.onlineAdminsQuantity;
        }

        if (type === 'receiveMessages') {
            messages = event.data.messages;
            displayMessages();
            updateMessageNotification()
        }

        if (type === "Open" && !opened) {
            config.scriptCfg = event.data.scriptCfg,

            list.registersList = event.data.registers,
            list.vehicleList = event.data.vehicle,
            list.rolesList = event.data.roles,
            list.inventoryList = event.data.inventory,
            list.weaponsList = event.data.weapons,
            list.banList = event.data.bans;
            
            list.graphList = {}
            list.resourcesList = {}
            
            currentMyReportId = null
            myId = event.data.myId
            currentPlayerId = myId
            spawnId = myId
            currentPageLoading = 1

            list.reportsList = event.data.reports
            list.suspectsList = event.data.suspects
            list.staffsList = event.data.staffsList

            openPanel(pData, pCollected);
            dragBody()
        } else if (type === "Close" && opened) {
            closePanel();
        } else if (type === 'update') {
            let listUpdated = false;
            const {
                suspects,
                resources,
                staffsList,
                reports,
                playerInfos,
                playerId,
                scriptCfg,
                graph,
            } = event.data;
        
            if (suspects) list.suspectsList = suspects; listUpdated = true;
            if (resources) list.resourcesList = resources; listUpdated = true;
            if (staffsList) list.staffsList = staffsList; listUpdated = true;
            if (scriptCfg) config.scriptCfg = scriptCfg; listUpdated = true;

            if (graph) {
                for (const [k, v] of Object.entries(graph)) {
                  list.graphList[k] = v
                }
                listUpdated = true;
            }
        
            if (reports) {
                list.reportsList = reports;
        
                for (const [key, value] of Object.entries(list.reportsList)) {
                    if (Number(value.author) === Number(myId)) {
                        myReports[key] = value;
                    }
                }
        
                if (currentReportId) displayReportMessages(currentReportId);
                if (currentMyReportId) displayMyReportMessages(currentMyReportId);
                listUpdated = true;
            } else if (playerInfos) {
                playersData[playerId] = playerInfos;
                currentContainer = '';
                document.getElementById('sidebar_players').click();
                playAudio('click');
                setTimeout(() => {
                    toggleSection('currentPlayer-container', true, true);
                }, 200);
                listUpdated = true;
            } else if (pData) {

                playersData =  event.data.playersData;
                playersCollected =  event.data.playersCollected;

                currentContainer = '';
                document.getElementById('sidebar_players').click();
                playAudio('click');

                setTimeout(() => {
                    toggleSection('collectedPlayers-container', true, true);
                }, 50);
                
                listUpdated = true;
            }
        
            if (listUpdated) {
                containerUpdated = true;  // Só marca como atualizado se list for modificado
            }

        } else if (type === 'notify') {
            showNotification(event.data.notifyType, event.data.message, event.data.audioType, event.data.important, event.data.realTime);
        } else if (type === 'copy') {
            const data = event.data.data;

            const tempInput = document.createElement('textarea');
            tempInput.value = data;
            document.body.appendChild(tempInput);
            tempInput.select();
        
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Erro ao copiar o texto: ', err);
            }
        
            document.body.removeChild(tempInput);
        }
    });
});

async function openPanel(pData, pCollected) {
    playersData = pData;
    playersCollected = pCollected;
    opened = true;
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && opened) {
            closePanel();
        }
    });

    openNUI()
    buildNav();
}

function closeNUI() {
    const nav = document.querySelector('nav');
    if (nav) {
        nav.style.display = 'none'
    }
    const main = document.querySelector('main');
    if (main) {
        main.style.display = 'none'
    }
}

function openNUI() {
    const nav = document.querySelector('nav');
    if (nav && opened) {
        nav.style.display = 'block'
    }
    const main = document.querySelector('main');
    if (main && opened) {
        main.style.display = 'block'
    }
}

function closePanel() {
    opened = false; 
    currentContainer = ''
    closeNUI();
    if (document.getElementById('tutorial-container')) {
        document.getElementById('tutorial-container').remove();
        if (document.querySelector('.highlight')) {
            document.querySelector('.highlight').classList.remove('highlight');
        }
        if (document.getElementById('overlay')) {
            document.getElementById('overlay').remove();
        }
    }
    $.post('http://arc.Panel/closePanel', JSON.stringify({}));
}

//////////////

//showNotification('error', 'Você não tem permissão!');
//showNotification('success', 'Você tem permissão!');

function playAudio(audioSrc) {
    if (!config.sounds) {
        return
    }
    const audio = new Audio();
    audio.src = `sounds/${audioSrc}.mp3`;
    audio.volume = 0.1;
    audio.play();
}

function showNotification(type, message, audioType, important, realTime) {
    if (!config.notify && !important && !realTime) {
        return
    }
    if (realTime && !config.realTimeNotify) {
        return
    }
    const notificationContainer = document.getElementById('notification-container');

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    notification.style.display = 'block';
    notification.style.opacity = 1;

    if (!audioType) {
        playAudio(type)
    } else {
        playAudio(audioType)
    }

    setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

let popupTimeout;

function showPopup(type, title, msg) {

    if (!document.getElementById('popup')) {
        const popupDiv = document.createElement('div');
        popupDiv.innerHTML = `
            <!-- Container do pop-up -->
            <div id="popup" class="popup-container">
                <div class="popup-content">
                    <h2 id="popup-title"></h2>
                    <input type="text" id="popup-input" class="search-bar" style="display: none;" placeholder="Digite aqui..."> <!-- Campo de entrada, oculto por padrão -->
                    <p id="popup-message"></p> <!-- Elemento para exibir a mensagem -->
                    <div class="popup-buttons">
                        <button id="confirmButton" class="popup-btn confirm-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#ffffff" fill="none">
                                <path d="M11.4743 17.3058C14.4874 14.0819 17.3962 11.8949 21.0501 8.79776C22.1437 7.87072 22.3126 6.24578 21.4547 5.09453C20.5429 3.87098 18.8103 3.62642 17.6376 4.59913C14.2907 7.37521 11.6868 10.0482 9.21679 12.9051C9.08718 13.055 9.02237 13.13 8.95511 13.1722C8.78453 13.2792 8.57138 13.2803 8.3997 13.1751C8.33199 13.1336 8.26707 13.0601 8.13722 12.9131L6.82103 11.4229C5.6201 10.0631 3.46608 10.2137 2.46339 11.7274C1.76171 12.7867 1.86569 14.1905 2.71567 15.1334L4.7796 17.4229C6.32334 19.1353 7.09521 19.9916 8.02185 19.9999C8.94849 20.0083 9.79043 19.1075 11.4743 17.3058Z" stroke="currentColor" stroke-width="1.5" />
                            </svg>
                        </button>
                        <button id="cancelButton" class="popup-btn cancel-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#ffffff" fill="none">
                                <path d="M14.9994 15L9 9M9.00064 15L15 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="currentColor" stroke-width="1.5" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        body.appendChild(popupDiv);
    }

    return new Promise((resolve) => {
        const popup = document.getElementById('popup');
        const messageElement = document.getElementById('popup-message');
        const titleElement = document.getElementById('popup-title');
        const inputField = document.getElementById('popup-input');

        titleElement.textContent = title;

        if (msg) {
            messageElement.style.display = 'block';
            messageElement.textContent = msg;
        } else {
            messageElement.style.display = 'none';
        }

        if (type === 'input') {
            inputField.style.display = 'block';
            inputField.value = '';
            setTimeout(() => {
                inputField.focus();
            }, 50);
        } else {
            inputField.style.display = 'none';
        }

        popup.style.display = 'flex'

        clearTimeout(popupTimeout);

        popupTimeout = setTimeout(() => {
            hidePopup();
            showNotification('error', 'Tempo esgotado, nenhuma ação foi tomada.');
            resolve(false);
        }, 30000);

        document.getElementById('confirmButton').onclick = function() {
            hidePopup();
            if (type === 'input') {
                if (!inputField.value) {
                    resolve(false);
                } else {
                    resolve(inputField.value);
                }
            } else {
                resolve(true);
            }
        };

        document.getElementById('cancelButton').onclick = function() {
            hidePopup();
            resolve(false);
        };
    });
}

function hidePopup() {
    const popup = document.getElementById('popup');
    popup.style.display = 'none'
    clearTimeout(popupTimeout);
}

//////////////

function buildNav() {

    if (document.querySelector('nav')) {
        document.getElementById('sidebar_dashboard').click()
        return;
    }

    const nav = document.createElement('nav');

    const panelInfosBox = createPanelInfosBox();
    nav.appendChild(panelInfosBox);

    const sideBar = createNavSideBar();
    nav.appendChild(sideBar);

    body.insertBefore(nav, body.firstChild);

    const main = document.createElement('main');
    body.appendChild(main);

    loadNav()
}

function createPanelInfosBox() {
    const panelsInfos_box = document.createElement('div');
    panelsInfos_box.classList.add('panelsInfos_box')
    panelsInfos_box.innerHTML = `
        <img src="imgs/logo.png" alt="logo" draggable="false"/>
        <h1 style="font-size:14px">Arc Panel</h1>
    `;

    return panelsInfos_box;
}

function createNavSideBar() {
    const buttons = {
        "sidebar_dashboard": "Dashboard",
        "sidebar_messages": "Chat Admin",
        "sidebar_self": "Funções",
        "sidebar_players": "Jogadores",
        "sidebar_reports": "Reports",
        "sidebar_suspects": "Suspeitos",
        "sidebar_resources": "Resources",
        "sidebar_bans": "Banimentos",
        "sidebar_logs": "Registros",
        "sidebar_vehicles": "Veículos",
        "sidebar_weapons": "Armas",
        "sidebar_inventory": "Inventário",
        "sidebar_graphs": "Gráficos",
        "sidebar_config": "Configurações",
        "sidebar_leave": "Sair",
    }

    function createLI(id, svg) {
        if (buttons[id]) {
            const notificationBadge =
                id === "sidebar_messages" ? '<span id="message-notification" class="notification-badge" style="display: none;">0</span>' :
                '';
            return `
                <li id="${id}" style="position: relative;">  <!-- Adiciona o position: relative -->
                    ${svg}
                    ${notificationBadge}  <!-- Notificação incluída -->
                    <p>${buttons[id]}</p>
                </li>
            `;
        }
    }



    const svg = {
        "sidebar_dashboard": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V8C10 9.88562 10 10.8284 9.41421 11.4142C8.82843 12 7.88562 12 6 12C4.11438 12 3.17157 12 2.58579 11.4142C2 10.8284 2 9.88562 2 8V6Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M2 19C2 18.0681 2 17.6022 2.15224 17.2346C2.35523 16.7446 2.74458 16.3552 3.23463 16.1522C3.60218 16 4.06812 16 5 16H7C7.93188 16 8.39782 16 8.76537 16.1522C9.25542 16.3552 9.64477 16.7446 9.84776 17.2346C10 17.6022 10 18.0681 10 19C10 19.9319 10 20.3978 9.84776 20.7654C9.64477 21.2554 9.25542 21.6448 8.76537 21.8478C8.39782 22 7.93188 22 7 22H5C4.06812 22 3.60218 22 3.23463 21.8478C2.74458 21.6448 2.35523 21.2554 2.15224 20.7654C2 20.3978 2 19.9319 2 19Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M14 16C14 14.1144 14 13.1716 14.5858 12.5858C15.1716 12 16.1144 12 18 12C19.8856 12 20.8284 12 21.4142 12.5858C22 13.1716 22 14.1144 22 16V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V16Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M14 5C14 4.06812 14 3.60218 14.1522 3.23463C14.3552 2.74458 14.7446 2.35523 15.2346 2.15224C15.6022 2 16.0681 2 17 2H19C19.9319 2 20.3978 2 20.7654 2.15224C21.2554 2.35523 21.6448 2.74458 21.8478 3.23463C22 3.60218 22 4.06812 22 5C22 5.93188 22 6.39782 21.8478 6.76537C21.6448 7.25542 21.2554 7.64477 20.7654 7.84776C20.3978 8 19.9319 8 19 8H17C16.0681 8 15.6022 8 15.2346 7.84776C14.7446 7.64477 14.3552 7.25542 14.1522 6.76537C14 6.39782 14 5.93188 14 5Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
        `,
        "sidebar_self": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M6.57757 15.4816C5.1628 16.324 1.45336 18.0441 3.71266 20.1966C4.81631 21.248 6.04549 22 7.59087 22H16.4091C17.9545 22 19.1837 21.248 20.2873 20.1966C22.5466 18.0441 18.8372 16.324 17.4224 15.4816C14.1048 13.5061 9.89519 13.5061 6.57757 15.4816Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16.5 6.5C16.5 8.98528 14.4853 11 12 11C9.51472 11 7.5 8.98528 7.5 6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
        `,
        "sidebar_bans": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M12.5 22H6.59087C5.04549 22 3.81631 21.248 2.71266 20.1966C0.453366 18.0441 4.1628 16.324 5.57757 15.4816C7.97679 14.053 10.8425 13.6575 13.5 14.2952" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16.5 6.5C16.5 8.98528 14.4853 11 12 11C9.51472 11 7.5 8.98528 7.5 6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M16.7596 16.378C15.6796 16.378 15.2171 17.1576 15.0971 17.6373C14.9771 18.117 14.9771 19.856 15.0491 20.5755C15.2891 21.475 15.8891 21.8468 16.4771 21.9667C17.0171 22.0147 19.2971 21.9967 19.9571 21.9967C20.9171 22.0147 21.6371 21.6549 21.9371 20.5755C21.9971 20.2157 22.0571 18.2369 21.9071 17.6373C21.5891 16.6778 20.866 16.378 20.266 16.378M16.7596 16.378H20.266M16.7596 16.378C16.7596 16.378 16.7582 15.5516 16.7596 15.1173C16.7609 14.7204 16.726 14.3378 16.9156 13.9876C17.626 12.5748 19.666 12.7187 20.17 14.1579C20.2573 14.3948 20.2626 14.7704 20.26 15.1173C20.2567 15.5605 20.266 16.378 20.266 16.378" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        `,
        "sidebar_graphs": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M6.5 17.5L6.5 14.5M11.5 17.5L11.5 8.5M16.5 17.5V13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M21.5 5.5C21.5 7.15685 20.1569 8.5 18.5 8.5C16.8431 8.5 15.5 7.15685 15.5 5.5C15.5 3.84315 16.8431 2.5 18.5 2.5C20.1569 2.5 21.5 3.84315 21.5 5.5Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M21.4955 11C21.4955 11 21.5 11.3395 21.5 12C21.5 16.4784 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4784 2.5 12C2.5 7.52169 2.5 5.28252 3.89124 3.89127C5.28249 2.50003 7.52166 2.50003 12 2.50003L13 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `,
        "sidebar_logs": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M11.0065 21H9.60546C6.02021 21 4.22759 21 3.11379 19.865C2 18.7301 2 16.9034 2 13.25C2 9.59661 2 7.76992 3.11379 6.63496C4.22759 5.5 6.02021 5.5 9.60546 5.5H13.4082C16.9934 5.5 18.7861 5.5 19.8999 6.63496C20.7568 7.50819 20.9544 8.7909 21 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18.85 18.85L17.5 17.95V15.7M13 17.5C13 19.9853 15.0147 22 17.5 22C19.9853 22 22 19.9853 22 17.5C22 15.0147 19.9853 13 17.5 13C15.0147 13 13 15.0147 13 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16 5.5L15.9007 5.19094C15.4056 3.65089 15.1581 2.88087 14.5689 2.44043C13.9796 2 13.197 2 11.6316 2H11.3684C9.80304 2 9.02036 2 8.43111 2.44043C7.84186 2.88087 7.59436 3.65089 7.09934 5.19094L7 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `,
        "sidebar_players": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M18.6161 20H19.1063C20.2561 20 21.1707 19.4761 21.9919 18.7436C24.078 16.8826 19.1741 15 17.5 15M15.5 5.06877C15.7271 5.02373 15.9629 5 16.2048 5C18.0247 5 19.5 6.34315 19.5 8C19.5 9.65685 18.0247 11 16.2048 11C15.9629 11 15.7271 10.9763 15.5 10.9312" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M4.48131 16.1112C3.30234 16.743 0.211137 18.0331 2.09388 19.6474C3.01359 20.436 4.03791 21 5.32572 21H12.6743C13.9621 21 14.9864 20.436 15.9061 19.6474C17.7889 18.0331 14.6977 16.743 13.5187 16.1112C10.754 14.6296 7.24599 14.6296 4.48131 16.1112Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M13 7.5C13 9.70914 11.2091 11.5 9 11.5C6.79086 11.5 5 9.70914 5 7.5C5 5.29086 6.79086 3.5 9 3.5C11.2091 3.5 13 5.29086 13 7.5Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
        `,
        "sidebar_reports": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M16.9961 9.01264H17.0042M17.0045 7.00903V4.50451M22 6.792C22 9.43833 19.7593 11.584 16.9961 11.584C16.6711 11.5844 16.3472 11.5543 16.028 11.4943C15.7983 11.4511 15.6835 11.4296 15.6033 11.4418C15.523 11.454 15.4094 11.5145 15.1822 11.6356C14.5393 11.9778 13.7896 12.0987 13.0686 11.9645C13.3426 11.627 13.5298 11.2222 13.6123 10.7882C13.6624 10.5228 13.5384 10.2649 13.3526 10.0762C12.5093 9.21878 11.9922 8.06347 11.9922 6.792C11.9922 4.14565 14.2328 2 16.9961 2C19.7593 2 22 4.14565 22 6.792Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M7.50189 22H4.71817C4.39488 22 4.07021 21.9545 3.77327 21.8269C2.80666 21.4116 2.31624 20.8633 2.08769 20.5202C1.95764 20.325 1.97617 20.0764 2.11726 19.889C3.23716 18.4015 5.8337 17.503 7.50189 17.5029M7.50665 22H10.2904C10.6137 22 10.9383 21.9545 11.2353 21.8269C12.2019 21.4116 12.6923 20.8633 12.9209 20.5202C13.0509 20.325 13.0324 20.0764 12.8913 19.889C11.7714 18.4015 9.17484 17.503 7.50665 17.5029M10.2854 12.2888C10.2854 13.8201 9.0413 15.0614 7.50665 15.0614C5.97199 15.0614 4.72791 13.8201 4.72791 12.2888C4.72791 10.7575 5.97199 9.51611 7.50665 9.51611C9.0413 9.51611 10.2854 10.7575 10.2854 12.2888Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `,
        "sidebar_suspects": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M5.32171 9.6829C7.73539 5.41196 8.94222 3.27648 10.5983 2.72678C11.5093 2.42437 12.4907 2.42437 13.4017 2.72678C15.0578 3.27648 16.2646 5.41196 18.6783 9.6829C21.092 13.9538 22.2988 16.0893 21.9368 17.8293C21.7376 18.7866 21.2469 19.6548 20.535 20.3097C19.241 21.5 16.8274 21.5 12 21.5C7.17265 21.5 4.75897 21.5 3.46496 20.3097C2.75308 19.6548 2.26239 18.7866 2.06322 17.8293C1.70119 16.0893 2.90803 13.9538 5.32171 9.6829Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M11.992 16H12.001" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M12 13L12 8.99997" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `,
        "sidebar_weapons": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M10.3882 10.5688L8.79732 17.2511C8.75319 17.4365 8.73112 17.5292 8.71527 17.6205C8.61639 18.1898 8.68403 18.7755 8.91005 19.3073C8.9463 19.3926 8.9889 19.4778 9.07412 19.6482C9.1303 19.7606 9.15839 19.8168 9.17103 19.8601C9.25397 20.1449 9.07232 20.4388 8.78058 20.4919C8.73614 20.5 8.67371 20.5 8.54885 20.5C7.40755 20.5 5.5236 20.5 4.52785 20.5C3.36423 20.5 2.78242 20.5 2.48609 20.1181C2.18976 19.7361 2.33087 19.1681 2.61309 18.032L3.96647 12.5841C4.22077 11.5604 3.45143 10.5688 2.40292 10.5688C2.18039 10.5688 2 10.3872 2 10.1633V7.58942C2 5.12449 2.51119 4.61005 4.96053 4.61005H18.1677C18.7887 4.61005 19.257 4.46352 19.7632 4.1239C20.3544 3.72724 21.0829 3.00608 21.6191 4.00889C22.1576 5.0161 22.187 9.24315 21.3033 10.1325C20.8698 10.5688 20.172 10.5688 18.7764 10.5688H10.3882ZM10.3882 10.5688H8.90791" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M9 14.5H9.87689C10.8276 14.5 11.303 14.5 11.7196 14.4102C12.9146 14.1527 13.9263 13.3628 14.466 12.2659C14.6541 11.8835 14.7694 11.4224 15 10.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M2 7.5H4.02786C5.23068 7.5 5.83209 7.5 6.31539 7.2013C6.7987 6.9026 7.06766 6.36469 7.60557 5.28885L8 4.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M22 7.5L19 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        `,
        "sidebar_resources": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <ellipse cx="11" cy="5" rx="8" ry="3" stroke="currentColor" stroke-width="1.5" />
                <path d="M6 10.8418C6.60158 11.0226 7.27434 11.1716 8 11.2817" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M3 12C3 13.5299 6.05369 14.7923 10 14.9768" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M6 17.8418C6.60158 18.0226 7.27434 18.1716 8 18.2817" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M11 22C6.58172 22 3 20.6569 3 19V5M19 5V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M17 20.7143V22M17 20.7143C15.8432 20.7143 14.8241 20.1461 14.2263 19.2833M17 20.7143C18.1568 20.7143 19.1759 20.1461 19.7737 19.2833M17 14.2857C18.1569 14.2857 19.1761 14.854 19.7738 15.7169M17 14.2857C15.8431 14.2857 14.8239 14.854 14.2262 15.7169M17 14.2857V13M21 14.9286L19.7738 15.7169M13.0004 20.0714L14.2263 19.2833M13 14.9286L14.2262 15.7169M20.9996 20.0714L19.7737 19.2833M19.7738 15.7169C20.1273 16.2271 20.3333 16.8403 20.3333 17.5C20.3333 18.1597 20.1272 18.773 19.7737 19.2833M14.2262 15.7169C13.8727 16.2271 13.6667 16.8403 13.6667 17.5C13.6667 18.1597 13.8728 18.773 14.2263 19.2833" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        `,
        "sidebar_inventory": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M2 13.4286V8H22V13.4286C22 17.4692 22 19.4895 20.6983 20.7447C19.3965 22 17.3014 22 13.1111 22H10.8889C6.69863 22 4.6035 22 3.30175 20.7447C2 19.4895 2 17.4692 2 13.4286Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M2 8L2.96154 5.69231C3.70726 3.90257 4.08013 3.0077 4.8359 2.50385C5.59167 2 6.56112 2 8.5 2H15.5C17.4389 2 18.4083 2 19.1641 2.50385C19.9199 3.0077 20.2927 3.90257 21.0385 5.69231L22 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M12 8V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M10 12H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        `,
        "sidebar_vehicles": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M9.0072 17C9.0072 18.1046 8.11177 19 7.0072 19C5.90263 19 5.0072 18.1046 5.0072 17C5.0072 15.8954 5.90263 15 7.0072 15C8.11177 15 9.0072 15.8954 9.0072 17Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M19.0072 17C19.0072 18.1046 18.1118 19 17.0072 19C15.9026 19 15.0072 18.1046 15.0072 17C15.0072 15.8954 15.9026 15 17.0072 15C18.1118 15 19.0072 15.8954 19.0072 17Z" stroke="currentColor" stroke-width="1.5" />
                <path d="M2.00722 10H18.0072M2.00722 10C2.00722 10.78 1.98723 13.04 2.01122 15.26C2.04719 15.98 2.1671 16.58 5.00893 17M2.00722 10C2.22306 8.26 3.16234 6.2 3.64197 5.42M9.00722 10V5M14.9973 17H9.00189M2.02321 5H12.2394C12.2394 5 12.779 5 13.2586 5.048C14.158 5.132 14.9134 5.54 15.6688 6.56C16.4687 7.64 17.0837 9.008 17.8991 9.74C19.2541 10.9564 21.8321 10.58 21.976 13.16C22.012 14.48 22.012 15.92 21.952 16.16C21.8557 16.8667 21.3108 16.9821 20.633 17C20.0448 17.0156 19.3357 16.9721 18.9903 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        `,
        "sidebar_messages": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M22 11.5667C22 16.8499 17.5222 21.1334 12 21.1334C11.3507 21.1343 10.7032 21.0742 10.0654 20.9545C9.60633 20.8682 9.37678 20.8251 9.21653 20.8496C9.05627 20.8741 8.82918 20.9948 8.37499 21.2364C7.09014 21.9197 5.59195 22.161 4.15111 21.893C4.69874 21.2194 5.07275 20.4112 5.23778 19.5448C5.33778 19.0148 5.09 18.5 4.71889 18.1231C3.03333 16.4115 2 14.1051 2 11.5667C2 6.28357 6.47778 2 12 2C17.5222 2 22 6.28357 22 11.5667Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                <path d="M11.9955 12H12.0045M15.991 12H16M8 12H8.00897" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `,
        "sidebar_config": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M21.3175 7.14139L20.8239 6.28479C20.4506 5.63696 20.264 5.31305 19.9464 5.18388C19.6288 5.05472 19.2696 5.15664 18.5513 5.36048L17.3311 5.70418C16.8725 5.80994 16.3913 5.74994 15.9726 5.53479L15.6357 5.34042C15.2766 5.11043 15.0004 4.77133 14.8475 4.37274L14.5136 3.37536C14.294 2.71534 14.1842 2.38533 13.9228 2.19657C13.6615 2.00781 13.3143 2.00781 12.6199 2.00781H11.5051C10.8108 2.00781 10.4636 2.00781 10.2022 2.19657C9.94085 2.38533 9.83106 2.71534 9.61149 3.37536L9.27753 4.37274C9.12465 4.77133 8.84845 5.11043 8.48937 5.34042L8.15249 5.53479C7.73374 5.74994 7.25259 5.80994 6.79398 5.70418L5.57375 5.36048C4.85541 5.15664 4.49625 5.05472 4.17867 5.18388C3.86109 5.31305 3.67445 5.63696 3.30115 6.28479L2.80757 7.14139C2.45766 7.74864 2.2827 8.05227 2.31666 8.37549C2.35061 8.69871 2.58483 8.95918 3.05326 9.48012L4.0843 10.6328C4.3363 10.9518 4.51521 11.5078 4.51521 12.0077C4.51521 12.5078 4.33636 13.0636 4.08433 13.3827L3.05326 14.5354C2.58483 15.0564 2.35062 15.3168 2.31666 15.6401C2.2827 15.9633 2.45766 16.2669 2.80757 16.8741L3.30114 17.7307C3.67443 18.3785 3.86109 18.7025 4.17867 18.8316C4.49625 18.9608 4.85542 18.8589 5.57377 18.655L6.79394 18.3113C7.25263 18.2055 7.73387 18.2656 8.15267 18.4808L8.4895 18.6752C8.84851 18.9052 9.12464 19.2442 9.2775 19.6428L9.61149 20.6403C9.83106 21.3003 9.94085 21.6303 10.2022 21.8191C10.4636 22.0078 10.8108 22.0078 11.5051 22.0078H12.6199C13.3143 22.0078 13.6615 22.0078 13.9228 21.8191C14.1842 21.6303 14.294 21.3003 14.5136 20.6403L14.8476 19.6428C15.0004 19.2442 15.2765 18.9052 15.6356 18.6752L15.9724 18.4808C16.3912 18.2656 16.8724 18.2055 17.3311 18.3113L18.5513 18.655C19.2696 18.8589 19.6288 18.9608 19.9464 18.8316C20.264 18.7025 20.4506 18.3785 20.8239 17.7307L21.3175 16.8741C21.6674 16.2669 21.8423 15.9633 21.8084 15.6401C21.7744 15.3168 21.5402 15.0564 21.0718 14.5354L20.0407 13.3827C19.7887 13.0636 19.6098 12.5078 19.6098 12.0077C19.6098 11.5078 19.7888 10.9518 20.0407 10.6328L21.0718 9.48012C21.5402 8.95918 21.7744 8.69871 21.8084 8.37549C21.8423 8.05227 21.6674 7.74864 21.3175 7.14139Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M15.5195 12C15.5195 13.933 13.9525 15.5 12.0195 15.5C10.0865 15.5 8.51953 13.933 8.51953 12C8.51953 10.067 10.0865 8.5 12.0195 8.5C13.9525 8.5 15.5195 10.067 15.5195 12Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
        `,
        "sidebar_leave": `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                <path d="M14 3.09502C13.543 3.03241 13.0755 3 12.6 3C7.29807 3 3 7.02944 3 12C3 16.9706 7.29807 21 12.6 21C13.0755 21 13.543 20.9676 14 20.905" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M21 12L11 12M21 12C21 11.2998 19.0057 9.99153 18.5 9.5M21 12C21 12.7002 19.0057 14.0085 18.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `
    }

    const ulBox = document.createElement('ul');

    ulBox.innerHTML = Object.keys(buttons).map(id => createLI(id, svg[id])).join("");
    return ulBox;
}

function loadNav() {
    const navButtons = [
        'sidebar_dashboard',
        'sidebar_self',
        'sidebar_players',
        'sidebar_reports',
        'sidebar_suspects',
        'sidebar_resources',
        'sidebar_inventory',
        'sidebar_vehicles',
        "sidebar_weapons",
        'sidebar_messages',
        'sidebar_config',
        "sidebar_bans",
        "sidebar_logs",
        "sidebar_graphs",
    ]

    document.getElementById('sidebar_leave').addEventListener('click', function() {
        closePanel()
    })

    for (const buttonId of navButtons) {
        document.getElementById(buttonId).addEventListener('click', function() {
            navButtons.forEach(id => {
                document.getElementById(id).classList.remove('active');
            });
            this.classList.add('active');
            buildNewContainer(buttonId.replace('sidebar_', ''));
        })
    }

    document.getElementById('sidebar_messages').addEventListener('click', function() {
        resetMessageNotification();
    });

    buildNewContainer('dashboard');
}

//////////////

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        closeNUI()
        loadingScreen.style.display = 'block';
    }
}

function stopLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        openNUI()
    }
}

async function waitForUpdate() {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            showLoadingScreen()
            if (containerUpdated) {
                clearInterval(interval);
                stopLoadingScreen()
                resolve();
            }
        }, 50); // Verifica a cada 50ms
    });
}

async function buildNewContainer(id) {
    const enabledContainers = [
        'dashboard',

        'self',
        'players',
        'messages',

        'reports',
        'suspects',
        'resources',
        'inventory',
        'vehicles',
        "weapons",
        'config',
        "bans",
        "logs",
        "graphs",
    ];

    for (const buttonId of enabledContainers) {
        if (id === buttonId && currentContainer !== buttonId) {
            currentContainer = buttonId;

            let main = document.querySelector('main');
            if (main) {
                main.remove();
            }

            main = document.createElement('main');
            main.id = id;
            main.classList.add('container');
            body.appendChild(main);

            try {
                switch (id) {
                    case 'self':
                        containerUpdated = true
                        break;
                    case 'messages':
                        containerUpdated = true
                        break;
                    case 'graphs':
                        if (Object.keys(list.graphList).length === 0) {
                          $.post('http://arc.Panel/updateGraphs', JSON.stringify({}));
                        } else {
                          containerUpdated = true
                        }
                        break;
                    case 'logs':
                        containerUpdated = true
                        break;
                    case 'inventory':
                        setTimeout(() => {
                            containerUpdated = true
                        }, 200);
                        break;
                    case 'vehicles':
                        setTimeout(() => {
                            containerUpdated = true
                        }, 200);
                        break;
                    case 'weapons':
                        setTimeout(() => {
                            containerUpdated = true
                        }, 200);
                        break;
                    case 'bans':
                        setTimeout(() => {
                            containerUpdated = true
                        }, 200);
                        break;

                    case 'players':
                        maxPages = Math.ceil(playersCollected / itemsPerPage);
                        containerUpdated = true
                        break;
                    case 'dashboard':
                        containerUpdated = true
                        break;
                    case 'reports':
                        containerUpdated = true
                        break;
                    case 'suspects':
                        containerUpdated = true
                        break;
                    case 'resources':
                        if (Object.keys(list.resourcesList).length === 0) {
                          $.post('http://arc.Panel/updateResources', JSON.stringify({}));
                        } else {
                          containerUpdated = true
                        }
                        break;
                    case 'config':
                        containerUpdated = true
                        break;
                }
            } catch (error) {
                console.error(`Failed to update container ${id}:`, error);
            }

            await waitForUpdate();
            containerUpdated = false;
            const container = createContainer(id);
            if (container) {
                main.innerHTML = container;

                switch (id) {
                    case 'players':
                        loadSearch('data-name', 'data-id');
                        loadSort();
                        loadPlayers()
                        break;
                    case 'messages':
                        displayMessages();
                        break;
                    case 'resources':
                        loadSearch('data-name', 'data-autor');
                        loadSort();
                        break;
                    case 'bans':
                        loadSearch('data-id');
                        loadSort();
                        break;
                    case 'config':
                        loadSearch('data-id', 'data-type');
                        loadSort();
                        break;
                    case 'reports':
                        loadSearch('data-id', 'data-type');
                        loadSort();
                        if (currentReportId) {
                            displayReportMessages(currentReportId);
                        }
                        break;
                    case 'suspects':
                        loadSearch('data-id', 'data-type');
                        loadSort();
                        break;
                    case 'logs':
                        loadSearch('data-id', 'data-type');
                        loadSort();
                        break;
                    case 'weapons':
                        loadSearch('data-name');
                        spawnId = myId;
                        break;
                    case 'graphs':
                        loadGraphs();
                        break;
                }
            } else {
                console.error('A função createContainer não retornou um elemento válido.');
            }
        }
    }
}


/////////Functions//////////////

//const hasPermission = checkPermissions(myId, "open_panel");
function checkPermissions(id, permission) {
    if (playersData[id] && Array.isArray(playersData[id].permissions)) {
        if (playersData[id].permissions.includes("super_admin")) {
            return true;
        }
        return playersData[id].permissions.includes(permission);
    }
    return false;
}

function sendLog(type, description) {
    $.post('http://arc.Panel/addRegister', JSON.stringify({author: myId, type: type, description: description}));
}

///////////////////////

function createSearchBar(title, placeholder) {
    const searchBar = `
    <!-- Campo de pesquisa -->
    <div id="search-bar" class="section-container">
        <label for="searchBar">${title}</label>
        <input type="text" id="searchBar" class="search-bar" placeholder="${placeholder}">
    </div>`
    return searchBar
}

function loadSearch(...searchAttributes) {
    const searchInput = document.getElementById('searchBar');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase();

            const containerIds = ['#sort-container', '#sort-container2', '#sort-container3', '#sort-container4'];

            containerIds.forEach(containerId => {
                const cards = Array.from(document.querySelectorAll(`${containerId} .new-card`));

                cards.forEach(function(card) {
                    const getAttr = (attr) => card.getAttribute(attr) ? card.getAttribute(attr).toLowerCase() : '';

                    let found = false;
                    searchAttributes.forEach(attr => {
                        const attrValue = getAttr(attr);
                        if (attrValue.includes(searchValue)) {
                            found = true;
                        }
                    });

                    card.style.display = found ? "block" : "none";
                });
            });
        });
    }
}


function createSort(...criteria) {
    const criteriaOptions = criteria.map(criterion => {
        const [value, label] = Object.entries(criterion)[0];
        return `<option value="${value}">${label}</option>`;
    }).join('');

    const sort = `
    <!-- Opções de ordenação -->
    <div id="sort-Data" class="section-container">
        <div class="sort-container">
            <label for="sortCriteria">Ordenar por:</label>
            <select id="sortCriteria" class="sort-dropdown">
                ${criteriaOptions}
            </select>

            <label for="sortOrder">Ordem:</label>
            <select id="sortOrder" class="sort-dropdown">
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
            </select>

            <button id="sortButton" class="sort-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                    <path d="M17.5 17.5L22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M20 11C20 6.02944 15.9706 2 11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C15.9706 20 20 15.9706 20 11Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                </svg>
            </button>
        </div>
    </div>
    `
    return sort;
}

function loadSort() {
    const sortButton = document.getElementById('sortButton');
    if (sortButton) {
        sortButton.addEventListener('click', function() {
            const criteria = document.getElementById('sortCriteria').value;
            const order = document.getElementById('sortOrder').value;

            const sortCards = (containerId) => {
                const cards = Array.from(document.querySelectorAll(`${containerId} .new-card`));

                cards.sort((a, b) => {
                    let aValue = a.getAttribute(`data-${criteria}`) || '';
                    let bValue = b.getAttribute(`data-${criteria}`) || '';

                    if (!aValue || !bValue) return 0;

                    aValue = isNaN(aValue) ? aValue : parseFloat(aValue);
                    bValue = isNaN(bValue) ? bValue : parseFloat(bValue);

                    if (order === 'asc') {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });

                const container = document.getElementById(containerId.replace('#', ''));
                cards.forEach(card => {
                    container.appendChild(card);
                });
            };

            sortCards('#sort-container');
            sortCards('#sort-container2');
            sortCards('#sort-container3');
            sortCards('#sort-container4');
        });
    }
}

async function updatePlayer(id) {
    currentPlayerId = id;
    $.post('http://arc.Panel/updatePlayer', JSON.stringify({currentPlayerId}));
}

function loadPlayers() {
    const playersList_container = document.getElementById('playersList-container')
    playersList_container.innerHTML = `
    ${Object.keys(playersData).map(playerId => {
        if (!playersData[playerId]) {
            return '';
        }
        return`
        <div class="new-card" data-name="${playersData[playerId].fullName}" data-id="${playerId}" data-online="${playersData[playerId].online}" data-admins="${playersData[playerId].permissions >= 1 ? true : false}" data-banned="${playersData[playerId].banned}">
            <div class="card-grid">
                <div class="card-item">
                    <label>Jogador:</label>
                    <p class="${playersData[playerId].banned ? 'yellow' : (playersData[playerId].online ? 'green' : 'red')}">[${playerId}] ${playersData[playerId].fullName}</p>
                </div>
                <div class="card-item">
                    <label>Status:</label>
                    <p class="${playersData[playerId].banned ? 'yellow' : (playersData[playerId].online ? 'green' : 'red')}">${playersData[playerId].banned ? 'Banido' : playersData[playerId].online ? 'Online' : 'Offline'}</p>
                </div>
                ${playersData[playerId].adminRoleName ? `
                    <div class="card-item">
                        <label style="color: var(--blue) !important;">Cargo (STAFF):</label>
                        <p class="blue">${playersData[playerId].adminRoleName || 'N/A'}</p>
                    </div>` : ''
                }
                ${playersData[playerId].adminPanelRoleName ? `
                    <div class="card-item">
                        <label style="color: var(--blue) !important;">Cargo (PAINEL):</label>
                        <p class="blue">${playersData[playerId].adminPanelRoleName || 'N/A'}</p>
                    </div>` : ''
                }
                <div class="card-item">
                    <button class="card-btn ${playersData[playerId].banned ? 'yellow' : (playersData[playerId].online ? 'green' : 'red')}" onclick="updatePlayer('${playerId}')">
                        Informações
                    </button>
                </div>
            </div>
        </div>`
    }).join('')}`
}

async function nextPage() {
    containerUpdated = false
    if (currentPageLoading < maxPages) {
        currentPageLoading++;

        showNotification('success', 'Mudando para a página: ' + currentPageLoading);
        $.post('http://arc.Panel/updatePage', JSON.stringify({currentPageLoading, currentPlayerId}));
        await waitForUpdate()
    }
}

async function lastPage() {
    containerUpdated = false
    if (currentPageLoading > 1) {
        currentPageLoading--;

        showNotification('success', 'Mudando para a página: ' + currentPageLoading);
        $.post('http://arc.Panel/updatePage', JSON.stringify({currentPageLoading, currentPlayerId}));
        await waitForUpdate()
    }
}

async function selectPage() {
    containerUpdated = false;
    const newPage = await showPopup('input', 'Digite a página que deseja acessar:', 'Máximo: ' + maxPages);
    const pageNumber = parseInt(newPage, 10);

    if (!isNaN(pageNumber)) {
        if (pageNumber > 0 && pageNumber <= maxPages) {
            currentPageLoading = pageNumber;

            showNotification('success', 'Mudando para a página: ' + currentPageLoading);
            $.post('http://arc.Panel/updatePage', JSON.stringify({ currentPageLoading, currentPlayerId }));
            await waitForUpdate();
        } else {
            showNotification('error', 'Número inválido. Por favor, insira um valor entre 1 e ' + maxPages);
        }
    } else {
        showNotification('error', 'Por favor, insira um número válido.');
    }
}

function createContainer(id) {
    const Containers = {
        'dashboard': `
        <div class="management">
            <div class="titleBox">
                <h1>DashBoard</h1>
            </div>
            
            <div class="section-container">
                <div class="card-grid">
                    <div id="playerList" class="card-item server" style="cursor: pointer;" onclick="toggleSection('players-container', true)">
                        <label style="color: var(--green); cursor: pointer;" onclick="event.stopPropagation(); toggleSection('players-container', true)">Jogadores online:</label>
                        <p class="green">${onlinePlayersQuantity}</p>
                    </div>
                    <div id="adminsList" class="card-item server" style="cursor: pointer;" onclick="toggleSection('admins-container', true)">
                        <label style="color: var(--blue); cursor: pointer;" onclick="event.stopPropagation(); toggleSection('admins-container', true)">Admins Online:</label>
                        <p class="blue">${onlineAdminsQuantity}</p>
                    </div>
                    <div id="list.reportsList" class="card-item server" style="cursor: pointer;" onclick="toggleSection('nonConcludedReports-container', true)">
                        <label style="color: var(--yellow); cursor: pointer;" onclick="event.stopPropagation(); toggleSection('nonConcludedReports-container', true)">Reports Não concluídos:</label>
                        <p class="yellow">${Object.values(list.reportsList).filter(report => !report.concluded).length}</p>
                    </div>
                    <div id="list.suspectsList" class="card-item server" style="cursor: pointer;" onclick="toggleSection('suspects-container', true)">
                        <label style="color: var(--red); cursor: pointer;" onclick="event.stopPropagation(); toggleSection('suspects-container', true)">Suspeitos Registrados:</label>
                        <p class="red">${Object.values(list.suspectsList).length}</p>
                    </div>

                    <div id="logsList" class="card-item server" style="cursor: pointer;" onclick="document.getElementById('sidebar_logs').click(); setTimeout(() => playAudio('click'), 300)">
                        <label style="cursor: pointer;" onclick="document.getElementById('sidebar_logs').click(); setTimeout(() => playAudio('click'), 300)">Logs Registradas:</label>
                        <p>${Object.values(list.registersList).length}</p>
                    </div>
                </div>
            </div>

            <div class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="green">Lista de Jogadores Online <button class="toggle-btn green" onclick="toggleSection('players-container')">Expandir</button></h2>
                <div id="players-container" style="display: none;">
                ${Object.keys(playersData).filter(playerId => playersData[playerId].online).map(playerId => {
                    if (!playersData[playerId].adminPanelRoleName) {
                    return `
                    <div class="new-card">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Jogador:</label>
                                <p class="green">[${playerId}] ${playersData[playerId].fullName}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn green" onclick="updatePlayer('${playerId}')">
                                    Informações
                                </button>
                            </div>
                            <div class="card-item">
                                <button class="card-btn green" onclick="TpTo('${playerId}')">
                                    Teleportar
                                </button>
                            </div>
                        </div>
                    </div>`}}).join('')}      
                </div>
            </div>

            <div class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="blue">Lista de Admins Online <button class="toggle-btn blue" onclick="toggleSection('admins-container')">Expandir</button></h2>
                <div id="admins-container" style="display: none;">
                ${Object.keys(playersData).filter(playerId => playersData[playerId].online).map(playerId => {
                    if (playersData[playerId].adminPanelRoleName) { 
                    return`
                    <div class="new-card">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Jogador:</label>
                                <p class="blue">[${playerId}] ${playersData[playerId].fullName}</p>
                            </div>
                            <div class="card-item">
                                <label>Cargo (STAFF):</label>
                                <p class="blue">${playersData[playerId].adminRoleName || 'N/A'}</p>
                            </div>
                            <div class="card-item">
                                <label>Cargo (PAINEL):</label>
                                <p class="blue">${playersData[playerId].adminPanelRoleName || 'N/A'}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn blue" onclick="updatePlayer('${playerId}')">
                                    Informações
                                </button>
                            </div>
                            <div class="card-item">
                                <button class="card-btn blue" onclick="TpTo('${playerId}')">
                                    Teleportar
                                </button>
                            </div>
                        </div>
                    </div>`}}).join('')}
                </div>
            </div>

            <div class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="yellow">Lista de Reports não Concluídos <button class="toggle-btn yellow" onclick="toggleSection('nonConcludedReports-container')">Expandir</button></h2>
                <div id="nonConcludedReports-container" style="display:none">
                    ${Object.keys(list.reportsList).filter(reportId => !list.reportsList[reportId].concluded).map(reportId => {
                    return `
                    <div class="new-card" data-reportid="${reportId}" data-id="${list.reportsList[reportId].author}" data-type="${list.reportsList[reportId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Report Id:</label>
                                <p class="yellow">${reportId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="yellow" style="cursor: pointer" onclick="updatePlayer('${list.reportsList[reportId].author}')">${list.reportsList[reportId].authorName} [${list.reportsList[reportId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="yellow">${list.reportsList[reportId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="yellow">${list.reportsList[reportId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="yellow">${list.reportsList[reportId].date}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn yellow" onclick="openReport(${reportId})">
                                    Abrir Chat
                                </button>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            <div class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="red">Lista de Suspeitos <button class="toggle-btn red" onclick="toggleSection('suspects-container')">Expandir</button></h2>
                <div id="suspects-container" style="display: none;">
                ${Object.keys(list.suspectsList).map(suspectId => {
                    return `
                    <div class="new-card" data-suspectid="${suspectId}" data-id="${list.suspectsList[suspectId].author}" data-type="${list.suspectsList[suspectId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Suspect Id:</label>
                                <p class="red">${suspectId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="red" style="cursor: pointer" onclick="updatePlayer('${list.suspectsList[suspectId].author}')">${list.suspectsList[suspectId].authorName} [${list.suspectsList[suspectId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="red">${list.suspectsList[suspectId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="red">${list.suspectsList[suspectId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="red">${list.suspectsList[suspectId].date}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn red" onclick="openSuspect(${suspectId})">
                                    Mais informações
                                </button>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>
        </div>
        `,
        'messages': `
            <div class="management">
                <div class="titleBox">
                    <h1>Mensagens Administrativas</h1>
                </div>

                <!-- Campo para criar nova mensagem -->
                <div id="message-creator" class="section-container">
                    <label for="newMessage">Escreva sua mensagem:</label>
                    <textarea id="newMessage" class="search-bar" placeholder="Digite sua mensagem aqui..." rows="3"></textarea>
                    <button id="messageButton" class="card-btn green" onclick="sendMessage(1)">Enviar Mensagem</button>
                </div>

                <!-- Histórico de mensagens -->
                <div class="section-container">
                    <h2>Histórico de Mensagens</h2>

                    <div id="messageHistory" class="message-history">
                        <!-- As mensagens aparecerão aqui -->
                    </div>
                </div>
            </div>
        `,
        'self': `
        <div id="functions-Data" class="management">
            <div class="titleBox">
                <h1>Funções</h1>
            </div>
            
            <div class="section-container">
                <h2>Funções Gerais <button class="toggle-btn white" onclick="toggleSection('generalActions-container')">Expandir</button></h2>
                <div id="generalActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('white','Noclip', "NoClip", true, '', 'basic_permissions')}
                        ${createCardBtn('white','Wall', "Wall", true, '', 'basic_permissions')}
                        ${createCardBtn('white','Freecam', "Freecam", true, '', 'basic_permissions')}
                        ${createCardBtn('white','Mudar Skin', "ChangeSkin")}
                        ${createCardBtn('green','Reviver', "Revive")}
                        ${createCardBtn('blue','Receber Colete', "Armour")}
                        ${createCardBtn('red','Morrer', "Kill")}
                        ${createCardBtn('yellow','Teleportar Waypoint', "TpWay")}
                        ${createCardBtn('yellow','Teleportar Coordenada', "TpCds")}
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções de Desenvolvedor <button class="toggle-btn white" onclick="toggleSection('devActions-container')">Expandir</button></h2>
                <div id="devActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('green','Copy VEC2', 'CopyVec', false, 'vec2')}
                        ${createCardBtn('green','Copy VEC3', 'CopyVec', false, 'vec3')}
                        ${createCardBtn('green','Copy VEC4', 'CopyVec', false, 'vec4')}
                        ${createCardBtn('green','Copy Heading', 'CopyVec', false, 'heading')}
                        ${createCardBtn('yellow','Debug Objetos', 'Debug', true, 'objects', '', 'dev_permissions')}
                        ${createCardBtn('yellow','Debug Peds', 'Debug', true, 'peds', '', 'dev_permissions')}
                        ${createCardBtn('yellow','Debug Veículos', 'Debug', true, 'vehicles', '', 'dev_permissions')}
                        ${createCardBtn('red','Deletar Objetos', 'Delete', false, 'objects')}
                        ${createCardBtn('red','Deletar Peds', 'Delete', false, 'peds')}
                        ${createCardBtn('red','Deletar Veículos', 'Delete', false, 'vehicles')}
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções de Hack <button class="toggle-btn white" onclick="toggleSection('hackActions-container')">Expandir</button></h2>
                <div id="hackActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('white','Super Pulo', "SuperJump", true, '', 'hack_permissions')}
                        ${createCardBtn('white','Super Corrida', "SuperRun", true, '', 'hack_permissions')}
                        ${createCardBtn('white','Super Natação', "SuperSwim", true, '', 'hack_permissions')}
                        ${createCardBtn('green','Stamina Infinita', "SuperStamina", true, '', 'hack_permissions')}
                        ${createCardBtn('blue','Forçar Mini Mapa', "DisplayRadar", true, '', 'hack_permissions')}
                        ${createCardBtn('yellow','Invisível', "Invisible", true, '', 'hack_permissions')}
                        ${createCardBtn('yellow','Invencível', "Invincible", true, '', 'hack_permissions')}
                        ${createCardBtn('red','Aimbot', "Aimbot", true, '', 'hack_permissions')}
                        ${createCardBtn('red','Munição Infinita', "InfAmmo", true, '', 'hack_permissions')}
                        ${createCardBtn('red','Hit Kill', "HitKill", true, '', 'hack_permissions')}
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções do Servidor <button class="toggle-btn white" onclick="toggleSection('serverActions-container')">Expandir</button></h2>
                <div id="serverActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('blue','Anúncio Geral', "Geral", false, 'announce')}
                        ${createCardBtn('green','Reviver Geral', "Geral", false, 'revive')}
                        ${createCardBtn('yellow','Matar Geral', "Geral", false, 'kill')}
                        ${createCardBtn('red','Expulsar Geral', "Geral", false, 'kick')}
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções de Spawn <button class="toggle-btn white" onclick="toggleSection('spawnActions-container')">Expandir</button></h2>
                <div id="spawnActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('green', 'Spawnar Dinheiro', "Spawn", false, 'money, ' + myId)}
                        ${createCardBtn('yellow', 'Spawnar Veículo', "Spawn", false, 'vehicle, ' + myId)}
                        ${createCardBtn('blue', 'Spawnar Item', "Spawn", false, 'item, ' + myId)}
                        ${createCardBtn('red', 'Spawnar Arma', "Spawn", false, 'weapon, ' + myId)}                    
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções de Veículos <button class="toggle-btn white" onclick="toggleSection('vehicleActions-container')">Expandir</button></h2>
                <div id="vehicleActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('green','Maximizar Veículo', 'maxVeh', false, myId)}
                        ${createCardBtn('green','Maximizar Velocidade', 'maxVehSpeed', false, myId)}
                        ${createCardBtn('green','Consertar Veículo', 'fixVeh', false, myId)}
                        ${createCardBtn('yellow','Entrar no Veículo Próximo', 'joinVeh')}
                        ${createCardBtn('yellow','Trancar Veículo Próximo', 'lockVeh')}
                        ${createCardBtn('yellow','Destrancar Veículo Próximo', 'unlockVeh')}
                        ${createCardBtn('red','Quebrar Veículo', 'breakVeh', false, myId)}
                        ${createCardBtn('red','Deletar Veículo', 'deleteVeh', false, myId)}
                        ${createCardBtn('blue','Mudar Cor', 'changeVehColor', false, myId)}
                        ${createCardBtn('white','Limpar Veículo', 'cleanVeh', false, myId)}
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções de Clima <button class="toggle-btn white" onclick="toggleSection('climateActions-container')">Expandir</button></h2>
                <div id="climateActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('yellow', 'Ensolarado', 'setWeather', false, 'sunny')}
                        ${createCardBtn('blue', 'Chuvoso', 'setWeather', false, 'rainy')}
                        ${createCardBtn('red', 'Trovoso', 'setWeather', false, 'stormy')}
                        ${createCardBtn('white', 'Nublado', 'setWeather', false, 'cloudy')}
                        ${createCardBtn('white', 'Neblina', 'setWeather', false, 'foggy')}
                        ${createCardBtn('white', 'Neve', 'setWeather', false, 'snowy')}
                        ${createCardBtn('white', 'Nevasca', 'setWeather', false, 'blizzard')}
                    </div>
                </div>
            </div>

            <div class="section-container">
                <h2>Funções de Horas <button class="toggle-btn white" onclick="toggleSection('hoursActions-container')">Expandir</button></h2>
                <div id="hoursActions-container" style="display: none;">
                    <div class="card-flex">
                        ${createCardBtn('white','00:00', 'setHour', false, 1)}
                        ${createCardBtn('white','03:00', 'setHour', false, 2)}
                        ${createCardBtn('white','06:00', 'setHour', false, 3)}
                        ${createCardBtn('white','09:00', 'setHour', false, 4)}
                        ${createCardBtn('white','12:00', 'setHour', false, 5)}
                        ${createCardBtn('white','15:00', 'setHour', false, 6)}
                        ${createCardBtn('white','18:00', 'setHour', false, 7)}
                        ${createCardBtn('white','21:00', 'setHour', false, 8)}
                    </div>
                </div>
            </div>
        </div>
        `,
        "players": `
        <div class="management">
            <div class="titleBox">
                <h1>Jogadores</h1>
            </div>

            ${createSearchBar('Pesquisar Jogador:', 'Digite o nome ou ID do jogador...')}
            ${createSort({id: "Player ID"}, {online: "Online"}, {admins: "Admins"}, {banned: "Banidos"})}
            <div id="sort-container" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="blue">Jogadores Coletados: ${playersCollected} <button class="toggle-btn blue" onclick="toggleSection('collectedPlayers-container')">Expandir</button></h2>
                <div id="collectedPlayers-container" style="display:none">

                    <div class="card-flex" style="margin-bottom:20px">
                        <div class="card-item">
                            <button class="card-btn ${currentPageLoading === 1 ? 'red' : 'green'}" onclick="lastPage()">
                                Anterior
                            </button>
                        </div>
                        <label>${(currentPageLoading - 1) * itemsPerPage + 1} - ${Math.min(currentPageLoading * itemsPerPage, playersCollected)} de ${playersCollected}</label>
                        <div class="card-item">
                            <button class="card-btn ${currentPageLoading === maxPages ? 'red' : 'green'}" onclick="nextPage()">
                                Próxima
                            </button>
                        </div>
                        <button id="sortButton" class="sort-btn" onclick="selectPage()">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                                <path d="M17.5 17.5L22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                <path d="M20 11C20 6.02944 15.9706 2 11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C15.9706 20 20 15.9706 20 11Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div id="playersList-container">
                    </div>
                </div>
            </div>

            ${currentPlayerId && playersData[currentPlayerId] ? `
                <div class="section-container" id="currentPlayer-cont">
                <h2>Jogador Atual: ${currentPlayerId} <button class="toggle-btn white" onclick="toggleSection('currentPlayer-container')">Expandir</button></h2>
                <div id="currentPlayer-container" style="display:none">
                    <div class="new-card">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Jogador:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}">[${currentPlayerId}] ${playersData[currentPlayerId].fullName}</p>
                            </div>
                            <div class="card-item">
                                <label>Status:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}">${playersData[currentPlayerId].banned ? 'Banido' : (playersData[currentPlayerId].online ? 'Online' : 'Offline')}</p>
                            </div>
                            ${playersData[currentPlayerId].adminRoleName ? `
                            <div class="card-item">
                                <label style="color: var(--blue) !important;">Cargo (STAFF):</label>
                                <p class="blue">${playersData[currentPlayerId].adminRoleName || 'N/A'}</p>
                            </div>` : ''
                            }
                            ${playersData[currentPlayerId].adminPanelRoleName ? `
                                <div class="card-item">
                                    <label style="color: var(--blue) !important;">Cargo (PAINEL):</label>
                                    <p class="blue">${playersData[currentPlayerId].adminPanelRoleName || 'N/A'}</p>
                                </div>` : ''
                                }
                            <div class="card-item">
                                <label>Grupo:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}">${playersData[currentPlayerId].roleName || 'Cidadão'}</p>
                            </div>
                            <div class="card-item">
                                <label>Coordenadas:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].coords.x}, ${playersData[currentPlayerId].coords.y}, ${playersData[currentPlayerId].coords.z}</p>
                            </div>
                            <div class="card-item">
                                <label>Vida:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].health}</p>
                            </div>
                            <div class="card-item">
                                <label>Colete:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].armour}</p>
                            </div>
                            <div class="card-item">
                                <label>Carteira:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> $${playersData[currentPlayerId].wallet}</p>
                            </div>
                            <div class="card-item">
                                <label>Banco:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> $${playersData[currentPlayerId].bank}</p>
                            </div>
                            <div class="card-item">
                                <label>Celular:</label>
                                <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].phone}</p>
                            </div>
                            ${playersData[currentPlayerId].online ? `
                                <div class="card-item">
                                    <label>Steam:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.steam}</p>
                                </div>
                                <div class="card-item">
                                    <label>Discord:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.discord}</p>
                                </div>
                                <div class="card-item">
                                    <label>License:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.license}</p>
                                </div>
                                <div class="card-item">
                                    <label>License2:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.license2}</p>
                                </div>
                                <div class="card-item">
                                    <label>Xbl:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.xbl}</p>
                                </div>
                                <div class="card-item">
                                    <label>Live:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.live}</p>
                                </div>
                                <div class="card-item">
                                    <label>Ip:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.ip}</p>
                                </div>
                                <div class="card-item">
                                    <label>Tokens:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.tokens}</p>
                                </div>
                                <div class="card-item">
                                    <label>Fivem:</label>
                                    <p class="${playersData[currentPlayerId].banned ? 'yellow' : (playersData[currentPlayerId].online ? 'green' : 'red')}"> ${playersData[currentPlayerId].infos.fivem}</p>
                                </div>
                                `
                                : ''
                            }
                        </div>
                    </div>
                    <div class="new-card">
                        ${!playersData[currentPlayerId].banned ? `
                        <div class="section-container">
                            <h2 class="yellow">Funções Gerais <button class="toggle-btn yellow" onclick="toggleSection('generalActions-container')">Expandir</button></h2>
                            <div id="generalActions-container" style="display: none;">
                                <div class="card-flex">
                                    ${playersData[currentPlayerId].online ? 
                                        `${createCardBtn('green','Reviver', 'Revive', false, currentPlayerId)}` +
                                        `${createCardBtn('blue','Dar Colete', 'Armour', false, currentPlayerId)}` +
                                        `${createCardBtn('white','Teleportar até mim', 'TpToMe', false, currentPlayerId)}` +
                                        `${createCardBtn('white','Teleportar até o jogador', 'TpTo', false, currentPlayerId)}` +
                                        `${createCardBtn('white','Dar Choque', 'TazePlayer', false, currentPlayerId)}` +
                                        `${createCardBtn('yellow','Dar Arma', "Spawn", false, 'weapon, ' + currentPlayerId)}` +
                                        `${createCardBtn('yellow','Limpar Armas', 'RemoveWeapons', false, currentPlayerId)}` +
                                        `${createCardBtn('yellow','Matar', 'Kill', false, currentPlayerId)}`
                                        : ''
                                    }
                                    ${createCardBtn('red','Remover WL', 'RemoveWhitelist', false, currentPlayerId)}
                                </div>
                            </div>
                        </div>` : ''}

                        ${playersData[currentPlayerId].online ? `
                        <div class="section-container">
                            <h2 class="blue">Funções de Segurança <button class="toggle-btn blue" onclick="toggleSection('securityActions-container')">Expandir</button></h2>
                            <div id="securityActions-container" style="display: none;">
                                <div class="card-flex">
                                    ${createCardBtn('white','ScreenShot', 'ScreenShot', false, currentPlayerId)}
                                    ${createCardBtn('red','Congelar Jogador', 'Freeze', true, currentPlayerId, 'freeze_player')}
                                    ${createCardBtn('yellow','Spectar Jogador', 'Spectate', true, currentPlayerId, 'basic_permissions')}
                                    ${createCardBtn('blue','Enviar Notificação', 'SendNotify', false, currentPlayerId)}
                                </div>
                            </div>
                        </div>` : ''
                        }

                        <div class="section-container">
                            <h2 class="red">Funções de Punição <button class="toggle-btn red" onclick="toggleSection('punishmentActions-container')">Expandir</button></h2>
                            <div id="punishmentActions-container" style="display: none;">
                                <div class="card-flex">
                                    ${!playersData[currentPlayerId].banned ?
                                        `${createCardBtn('red','Ban', 'ban', false, currentPlayerId)}`
                                        : 
                                        `${createCardBtn('red','Unban', 'unban', false, currentPlayerId)}`
                                    }
                                    ${playersData[currentPlayerId].online ? 
                                        `${createCardBtn('red','Kick', 'kick', false, currentPlayerId)}` +
                                        `${createCardBtn('blue','Prender', 'arrest', false, currentPlayerId)}` 
                                        : '' 
                                    }
                                </div>
                            </div>
                        </div>

                        ${!playersData[currentPlayerId].banned ? `
                        <div class="section-container">
                            <h2 class="green">Funções Monetárias <button class="toggle-btn green" onclick="toggleSection('moneyActions-container')">Expandir</button></h2>
                            <div id="moneyActions-container" style="display: none;">
                                <div class="card-flex">
                                    ${createCardBtn('green','Dar Dinheiro', "Spawn", false, 'money, ' + currentPlayerId)}
                                    ${createCardBtn('red','Remover Dinheiro', "RemoveMoney", false, currentPlayerId)}
                                </div>
                            </div>
                        </div>` : '' }

                        <div class="section-container">
                            <h2 class="white">Funções de Groups 
                                <button class="toggle-btn white" onclick="toggleSection('groupActions-container')">Expandir</button>
                            </h2>
                            <div id="groupActions-container" style="display: none;">
                                ${['staff', 'legal', 'ilegal']
                                    .map(type => {
                                        const filteredRoles = Object.keys(list.rolesList)
                                            .filter(roleName => list.rolesList[roleName]?.type === type)
                                            .sort((a, b) => {
                                                const order = { 'staff': 1, 'legal': 2, 'ilegal': 3};
                                                return order[list.rolesList[a].type] - order[list.rolesList[b].type];
                                            })
                                            .map(roleName => {
                                                let roleColor = 'white';
                                                if (list.rolesList[roleName].type === 'staff') {
                                                    roleColor = 'blue';
                                                } else if (list.rolesList[roleName].type === 'legal') {
                                                    roleColor = 'green';
                                                } else if (list.rolesList[roleName].type === 'ilegal') {
                                                    roleColor = 'yellow';
                                                }
                                                if (playersData[currentPlayerId].roleName === roleName || playersData[currentPlayerId].adminRoleName === roleName) {
                                                    roleColor = roleColor + ' active';
                                                }
                                                return createCardBtn(roleColor, roleName, 'setGroup', false, `${list.rolesList[roleName].set}, ` + currentPlayerId + `, ${playersData[currentPlayerId].adminRoleName === roleName || playersData[currentPlayerId].roleName === roleName ? 'rem' : 'add'}` + `${list.rolesList[roleName].level ? `, ${list.rolesList[roleName].level}` : ''}`);
                                            }).join('');

                                        return `
                                            <div class="card-flex" style="margin-bottom: 15px;">
                                                ${filteredRoles}
                                            </div>
                                        `;
                                    }).join('')}
                            </div>
                        </div>


                        <div class="section-container">
                            <h2 class="blue">Funções de Inventário <button class="toggle-btn blue" onclick="toggleSection('inventoryActions-container')">Expandir</button></h2>
                            <div id="inventoryActions-container" style="display: none;">
                                <div class="card-flex" style="margin-bottom:30px">
                                    ${createCardBtn('green','Spawnar Item', "Spawn", false, 'item, ' + currentPlayerId)}
                                </div>
                                <div class="card-grid">
                                ${playersData[currentPlayerId].inventory ? `
                                ${Object.keys(playersData[currentPlayerId].inventory).map(itemName => {
                                        const item = playersData[currentPlayerId].inventory[itemName];
                                        return `
                                        <div class="card-item extended">
                                            <div class="image">
                                                <img src="${config.scriptCfg.Panel.InventoryImagesURL}${item.image}.png" alt="Image" draggable="false"/>
                                            </div>
                                            <label>${item.quantity}x | ${itemName}</label>
                                            <div class="buttons">
                                                <button class="card-btn red" onclick="RemoveItem('${item.index}', '${currentPlayerId}')">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#ffffff" fill="none">
                                                        <path d="M20 12L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        `;
                                    }).join('')}` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="section-container">
                            <h2 class="yellow">Funções de Veículos <button class="toggle-btn yellow" onclick="toggleSection('vehicleActions-container')">Expandir</button></h2>
                            <div id="vehicleActions-container" style="display: none;">
                                <div class="card-flex" style="margin-bottom:30px">
                                    ${playersData[currentPlayerId].online ? 
                                        `${createCardBtn('green','Spawnar Veículo', "Spawn", false, 'vehicle, ' + currentPlayerId)}` +
                                        `${createCardBtn('green','Consertar Veículo Em Uso', 'fixVeh', false, currentPlayerId)}` +
                                        `${createCardBtn('blue','Maximizar Veículo Em Uso', 'maxVeh', false, currentPlayerId)}` +
                                        `${createCardBtn('yellow','Quebrar Veículo Em Uso', 'breakVeh', false, currentPlayerId)}` +
                                        `${createCardBtn('red','Deletar Veículo Em Uso', 'deleteVeh', false, currentPlayerId)}` +
                                        `${createCardBtn('blue','Mudar Cor', 'changeVehColor', false, currentPlayerId)}` +
                                        `${createCardBtn('white','Limpar Veículo', 'cleanVeh', false, currentPlayerId)}`
                                        : '' 
                                    }
                                </div>
                                <div class="card-grid">
                                ${playersData[currentPlayerId].vehicles ? `
                                ${Object.keys(playersData[currentPlayerId].vehicles).map(vehicleName => {
                                        const vehicle = playersData[currentPlayerId].vehicles[vehicleName];
                                        return `
                                        <div class="card-item extended">
                                            <div class="image">
                                                <img src="https://docs.fivem.net/vehicles/${vehicle.index}.webp" alt="Image" draggable="false" onerror="this.onerror=null; this.src='imgs/addonVehicles/${vehicle.index}.png'"/>
                                            </div>
                                            <label>${vehicleName}</label>
                                            <div class="buttons">
                                                <button class="card-btn red" onclick="RemoveVehicle('${vehicle.index}', '${currentPlayerId}')">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#ffffff" fill="none">
                                                        <path d="M20 12L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        `;
                                    }).join('')}` : ''}
                                </div>
                                <div class="card-flex" style="margin-top:30px">
                                    <button class="card-btn green" onclick="AddVehicle('${currentPlayerId}')">Adicionar Veículo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                ` : ''}
        </div>
        `,
        "reports": `
        <div class="management">
            <div class="titleBox">
                <h1>Reports</h1>
            </div>

            ${createSearchBar('Pesquisar Report:', 'Digite o id do jogador ou tipo de report...')}
            ${createSort({reportid: "Report ID"}, {id: "Player ID"})}

            <div id="sort-container" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="yellow">Reports não Concluídos: ${Object.values(list.reportsList).filter(report => !report.concluded).length} <button class="toggle-btn yellow" onclick="toggleSection('nonConcludedReports-container')">Expandir</button></h2>
                <div id="nonConcludedReports-container" style="display:none">
                    ${Object.keys(list.reportsList).filter(reportId => !list.reportsList[reportId].concluded).map(reportId => {
                    return `
                    <div class="new-card" data-reportid="${reportId}" data-id="${list.reportsList[reportId].author}" data-type="${list.reportsList[reportId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Report Id:</label>
                                <p class="yellow">${reportId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="yellow" style="cursor: pointer" onclick="updatePlayer('${list.reportsList[reportId].author}')">${list.reportsList[reportId].authorName} [${list.reportsList[reportId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="yellow">${list.reportsList[reportId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="yellow">${list.reportsList[reportId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="yellow">${list.reportsList[reportId].date}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn yellow" onclick="openReport(${reportId})">
                                    Abrir Chat
                                </button>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            <div id="sort-container2" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="green">Reports Concluídos: ${Object.values(list.reportsList).filter(report => report.concluded).length} <button class="toggle-btn green" onclick="toggleSection('ConcludedReports-container')">Expandir</button></h2>
                <div id="ConcludedReports-container" style="display:none">
                    ${Object.keys(list.reportsList).filter(reportId => list.reportsList[reportId].concluded).map(reportId => {
                    return `
                    <div class="new-card" data-reportid="${reportId}" data-id="${list.reportsList[reportId].playerId}" data-type="${list.reportsList[reportId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Report Id:</label>
                                <p class="green">${reportId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="green" style="cursor: pointer" onclick="updatePlayer('${list.reportsList[reportId].author}')">${list.reportsList[reportId].authorName} [${list.reportsList[reportId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="green">${list.reportsList[reportId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Concluido Por:</label>
                                <p class="green">${list.reportsList[reportId].concluded.author}</p>
                            </div>
                            <div class="card-item">
                                <label>Data de Conclusão:</label>
                                <p class="green">${list.reportsList[reportId].concluded.date}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="green">${list.reportsList[reportId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="green">${list.reportsList[reportId].date}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn green" onclick="openReport(${reportId})">
                                    Abrir Chat
                                </button>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            ${currentReportId && list.reportsList[currentReportId] ? `
                <div class="section-container">
                    <h2>Report Atual: ${currentReportId} <button class="toggle-btn white" onclick="toggleSection('currentReport-container')">Expandir</button></h2>
                    <div id="currentReport-container" style="display:none">
                        <div class="new-card">
                            <div class="card-grid">
                                <div class="card-item">
                                    <label>Player:</label>
                                    <p class="white" style="cursor: pointer" onclick="updatePlayer('${list.reportsList[currentReportId].author}')">${list.reportsList[currentReportId].authorName} [${list.reportsList[currentReportId].author}]</p>
                                </div>
                                <div class="card-item">
                                    <label>Descrição:</label>
                                    <p class="white">${list.reportsList[currentReportId].description}</p>
                                </div>
                                <div class="card-item">
                                    <label>Data:</label>
                                    <p class="white">${list.reportsList[currentReportId].date}</p>
                                </div>
                                <div class="card-item">
                                    <label>Concluido:</label>
                                    <p class="white">${list.reportsList[currentReportId].concluded ? 'Sim' : 'Não'}</p>
                                </div>
                                ${list.reportsList[currentReportId].images ? ` ${list.reportsList[currentReportId].images.map((image, index) => `
                                <button class="toggle-btn white" onclick="zoomImage('${image}')">Imagem ${index + 1}</button>`).join('')}` : ''}
                            </div>
                        </div>
                        ${list.reportsList[currentReportId].concluded ? `` : `
                            <button class="card-btn green" onclick="concluedReport(${currentReportId})">Concluir Report</button>
                        `}
                    </div>
                </div>
                
                <!-- Campo para criar nova mensagem -->
                <div id="message-creator" class="section-container">
                    <label for="newMessage">Escreva sua mensagem:</label>
                    <textarea id="newMessage" class="search-bar" placeholder="Digite sua mensagem aqui..." rows="3"></textarea>
                    <button id="messageButton" class="card-btn green" onclick="sendMessage(2, ${currentReportId})">Enviar Mensagem</button>
                </div>

                <div class="section-container">
                    <div class="new-card">
                        <h2>Histórico de Mensagens</h2>
                        <div id="reportMessageHistory" class="message-history">
                        </div>
                    </div>
                </div>
            </div>` : ''}
        </div>
        `,
        "suspects": `
        <div class="management">
            <div class="titleBox">
                <h1>Suspeitos</h1>
            </div>

            ${createSearchBar('Pesquisar Suspeito:', 'Digite o id do jogador ou tipo de suspeita...')}
            ${createSort({suspectid: "Suspect ID"}, {id: "Player ID"})}

            <div id="sort-container" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="red">Suspeitos encontrados: ${Object.values(list.suspectsList).length} <button class="toggle-btn red" onclick="toggleSection('suspectsFound-container')">Expandir</button></h2>
                <div id="suspectsFound-container" style="display:none">
                    ${Object.keys(list.suspectsList).map(suspectId => {
                    return `
                    <div class="new-card" data-suspectid="${suspectId}" data-id="${list.suspectsList[suspectId].author}" data-type="${list.suspectsList[suspectId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Suspect Id:</label>
                                <p class="red">${suspectId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="red" style="cursor: pointer" onclick="updatePlayer('${list.suspectsList[suspectId].author}')">${list.suspectsList[suspectId].authorName} [${list.suspectsList[suspectId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="red">${list.suspectsList[suspectId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="red">${list.suspectsList[suspectId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="red">${list.suspectsList[suspectId].date}</p>
                            </div>
                            <div class="card-item">
                                <button class="card-btn red" onclick="openSuspect(${suspectId})">
                                    Mais informações
                                </button>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            ${currentSuspectId && list.suspectsList[currentSuspectId] ? `
                <div class="section-container">
                    <h2>Suspeito Atual: ${currentSuspectId} <button class="toggle-btn white" onclick="toggleSection('currentSuspect-container')">Expandir</button></h2>
                    <div id="currentSuspect-container" style="display:none">
                        <div class="new-card">
                            <div class="card-grid">
                                <div class="card-item">
                                    <label>Player:</label>
                                    <p class="white" style="cursor: pointer" onclick="updatePlayer('${list.suspectsList[currentSuspectId].author}')">${list.suspectsList[currentSuspectId].authorName} [${list.suspectsList[currentSuspectId].author}]</p>
                                </div>
                                <div class="card-item">
                                    <label>Descrição:</label>
                                    <p class="white">${list.suspectsList[currentSuspectId].description}</p>
                                </div>
                                <div class="card-item">
                                    <label>Data:</label>
                                    <p class="white">${list.suspectsList[currentSuspectId].date}</p>
                                </div>
                                <button class="toggle-btn white" onclick="zoomImage('${list.suspectsList[currentSuspectId].image}')">Imagem</button>
                            </div>
                        </div>
                        <button class="card-btn red" onclick="ban('${list.suspectsList[currentSuspectId].author}')">Banir Suspeito</button>
                        <button class="card-btn yellow" style="margin-left:20px" onclick="kick('${list.suspectsList[currentSuspectId].author}')">Expulsar Suspeito</button>
                        <button class="card-btn white" style="margin-left:20px" onclick="TpTo('${list.suspectsList[currentSuspectId].author}')">Teleportar até o Suspeito</button>
                    </div>
                </div>
            </div>` : ''}
        </div>
        `,
        "bans": `
        <div class="management">
            <div class="titleBox">
                <h1>Banimentos</h1>
            </div>

            ${createSearchBar('Pesquisar Banimento:', 'Digite o id do jogador...')}
            ${createSort({date: "Data"}, {expiration: "Expiração"}, {id: "Player ID"}, {banid: "Ban ID"})}

            <div id="sort-container" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="yellow">Banimentos Registrados: ${Object.keys(list.banList).length}</h2>
                ${Object.keys(list.banList).map(banId => {
                return`
                <div class="new-card" data-banid="${banId}" data-id="${list.banList[banId].infos.playerId}" data-date="${list.banList[banId].infos.date}" data-expiration="${list.banList[banId].infos.expiration}">
                    <div class="card-grid">
                        <div class="card-item">
                            <label>Ban Id:</label>
                            <p class="yellow">${banId}</p>
                        </div>
                        <div class="card-item">
                            <label>Player Id:</label>
                            <p class="yellow">${list.banList[banId].infos.playerId}</p>
                        </div>
                        <div class="card-item">
                            <label>Motivo:</label>
                            <p class="yellow">${list.banList[banId].infos.reason}</p>
                        </div>
                        <div class="card-item">
                            <label>Data:</label>
                            <p class="yellow">${list.banList[banId].infos.date}</p>
                        </div>
                        <div class="card-item">
                            <label>Expiração:</label>
                            <p class="yellow">${new Date(list.banList[banId].infos.expiration * 1000).toLocaleString('pt-BR')}</p>
                        </div>
                        <div class="card-item">
                            <button class="card-btn yellow" onclick="currentBanId=${banId}; currentContainer = ''; document.getElementById('sidebar_bans').click(); setTimeout(() => {playAudio('click'); toggleSection('currentPlayer-container', true);}, 300)">
                                Mais Informações
                            </button>
                        </div>
                    </div>
                </div>`}).join('')}
            </div>

            ${currentBanId && list.banList[currentBanId] ? `
                <div class="section-container">
                    <h2>Banimento Atual: ${currentBanId} <button class="toggle-btn white" onclick="toggleSection('currentPlayer-container')">Expandir</button></h2>
                    <div id="currentPlayer-container" style="display:none">
                        <div class="new-card">
                            <div class="card-grid">
                                <div class="card-item">
                                    <label>Ban Id:</label>
                                    <p class="yellow">${currentBanId}</p>
                                </div>
                                <div class="card-item">
                                    <label>Player Id:</label>
                                    <p class="yellow">${list.banList[currentBanId].infos.playerId}</p>
                                </div>
                                <div class="card-item">
                                    <label>Motivo:</label>
                                    <p class="yellow">${list.banList[currentBanId].infos.reason}</p>
                                </div>
                                <div class="card-item">
                                    <label>Data:</label>
                                    <p class="yellow">${list.banList[currentBanId].infos.date}</p>
                                </div>
                                <div class="card-item">
                                    <label>Expiração:</label>
                                    <p class="yellow">
                                    ${list.banList[currentBanId].infos.expiration ? 
                                        new Date(list.banList[currentBanId].infos.expiration * 1000).toLocaleString('pt-BR') : 
                                        'Nunca'}
                                    </p>
                                </div>
                                <div class="card-item">
                                    <label>Autor do Banimento:</label>
                                    <p class="yellow">${list.banList[currentBanId].infos.author}</p>
                                </div>
                                ${createCardBtn('red','Unban', 'unban', false, list.banList[currentBanId].infos.playerId)}
                            </div>
                        </div>
                        <div class="new-card">
                            <div class="card-grid">
                                ${Object.entries(list.banList[currentBanId].identifiers).map(([key, value]) => `
                                <div class="card-item">
                                    <label>${key.charAt(0).toUpperCase() + key.slice(1)}:</label>
                                    <p class="yellow">${value}</p>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                ` : ''}
        </div>
        `,
        "resources": `
        <div class="management">
            <div class="titleBox">
                <h1>Resources</h1>
            </div>

            ${createSearchBar('Pesquisar Resource:', 'Digite o nome do resource ou autor...')}
            ${createSort({status: "Status"})}

            <div id="sort-container" class="section-container">
                <h2 class="blue">Resources Encontrados: ${Object.keys(list.resourcesList).length}</h2>
                ${Object.keys(list.resourcesList).map(resourceName => {
                return`
                <div class="new-card" data-name="${resourceName}" data-autor="${list.resourcesList[resourceName].author}" data-status="${list.resourcesList[resourceName].status === 'started'}">
                    <div class="card-grid">
                        <div class="card-item">
                            <label>Resource:</label>
                            <p class="${list.resourcesList[resourceName].status === 'started' ? 'green' : 'red'}">${resourceName}</p>
                        </div>
                        ${list.resourcesList[resourceName].author ? `
                        <div class="card-item">
                            <label>Autor:</label>
                            <p class="${list.resourcesList[resourceName].status === 'started' ? 'green' : 'red'}">${list.resourcesList[resourceName].author}</p>
                        </div>
                        ` : ''}
                        ${list.resourcesList[resourceName].version ? `
                        <div class="card-item">
                            <label>Versão:</label>
                            <p class="${list.resourcesList[resourceName].status === 'started' ? 'green' : 'red'}">${list.resourcesList[resourceName].version}</p>
                        </div>
                        ` : ''}
                        <div class="card-item">
                            <label>Status:</label>
                            <p class="${list.resourcesList[resourceName].status === 'started' ? 'green' : 'red'}">${list.resourcesList[resourceName].status}</p>
                        </div>
                        ${list.resourcesList[resourceName].status === 'started' ? `
                        <div class="card-item">
                            <button class="card-btn red" onclick="changeResourceState('${resourceName}', 'stop')">
                                Stop
                            </button>
                        </div>
                        <div class="card-item">
                            <button class="card-btn yellow" onclick="changeResourceState('${resourceName}', 'restart')">
                                Restart
                            </button>
                        </div>
                        ` : `
                        <div class="card-item">
                            <button class="card-btn green" onclick="changeResourceState('${resourceName}', 'start')">
                                Start
                            </button>
                        </div>
                        `}
                    </div>
                </div>`}).join('')}
            </div>
        </div>
        `,
        "logs": `
        <div class="management">
            <div class="titleBox">
                <h1>Registros</h1>
            </div>

            ${createSearchBar('Pesquisar Registro:', 'Digite o id do jogador ou tipo de registro...')}
            ${createSort({registerid: "Register ID"}, {id: "Player ID"})}

            <div id="sort-container" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="red">Registro de importância 1: ${Object.values(list.registersList).filter(register => register.importance === 1).length} <button class="toggle-btn red" onclick="toggleSection('importanceOne-container')">Expandir</button></h2>
                <div id="importanceOne-container" style="display:none">
                    ${Object.keys(list.registersList).filter(registerId => list.registersList[registerId].importance === 1).map(registerId => {
                    return `
                    <div class="new-card" data-registerid="${registerId}" data-id="${list.registersList[registerId].author}" data-type="${list.registersList[registerId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Register Id:</label>
                                <p class="red">${registerId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="red" style="cursor: pointer" onclick="updatePlayer('${list.registersList[registerId].author}')">${list.registersList[registerId].authorName} [${list.registersList[registerId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="red">${list.registersList[registerId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="red">${list.registersList[registerId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="red">${list.registersList[registerId].date}</p>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            <div id="sort-container2" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="yellow">Registro de importância 2: ${Object.values(list.registersList).filter(register => register.importance === 2).length} <button class="toggle-btn yellow" onclick="toggleSection('importanceTwo-container')">Expandir</button></h2>
                <div id="importanceTwo-container" style="display:none">
                    ${Object.keys(list.registersList).filter(registerId => list.registersList[registerId].importance === 2).map(registerId => {
                    return `
                    <div class="new-card" data-registerid="${registerId}" data-id="${list.registersList[registerId].author}" data-type="${list.registersList[registerId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Register Id:</label>
                                <p class="yellow">${registerId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="yellow" style="cursor: pointer" onclick="updatePlayer('${list.registersList[registerId].author}')">${list.registersList[registerId].authorName} [${list.registersList[registerId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="yellow">${list.registersList[registerId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="yellow">${list.registersList[registerId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="yellow">${list.registersList[registerId].date}</p>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            <div id="sort-container3" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="blue">Registro de importância 3: ${Object.values(list.registersList).filter(register => register.importance === 3).length} <button class="toggle-btn blue" onclick="toggleSection('importanceThree-container')">Expandir</button></h2>
                <div id="importanceThree-container" style="display:none">
                    ${Object.keys(list.registersList).filter(registerId => list.registersList[registerId].importance === 3).map(registerId => {
                    return `
                    <div class="new-card" data-registerid="${registerId}" data-id="${list.registersList[registerId].author}" data-type="${list.registersList[registerId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Register Id:</label>
                                <p class="blue">${registerId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="blue" style="cursor: pointer" onclick="updatePlayer('${list.registersList[registerId].author}')">${list.registersList[registerId].authorName} [${list.registersList[registerId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="blue">${list.registersList[registerId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="blue">${list.registersList[registerId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="blue">${list.registersList[registerId].date}</p>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>

            <div id="sort-container4" class="section-container" style="max-height: 400px; overflow: auto;">
                <h2 class="green">Registro de importância 4: ${Object.values(list.registersList).filter(register => register.importance === 4).length} <button class="toggle-btn green" onclick="toggleSection('importanceFour-container')">Expandir</button></h2>
                <div id="importanceFour-container" style="display:none">
                    ${Object.keys(list.registersList).filter(registerId => list.registersList[registerId].importance === 4).map(registerId => {
                    return `
                    <div class="new-card" data-registerid="${registerId}" data-id="${list.registersList[registerId].author}" data-type="${list.registersList[registerId].type}">
                        <div class="card-grid">
                            <div class="card-item">
                                <label>Register Id:</label>
                                <p class="green">${registerId}</p>
                            </div>
                            <div class="card-item">
                                <label>Player:</label>
                                <p class="green" style="cursor: pointer" onclick="updatePlayer('${list.registersList[registerId].author}')">${list.registersList[registerId].authorName} [${list.registersList[registerId].author}]</p>
                            </div>
                            <div class="card-item">
                                <label>Tipo:</label>
                                <p class="green">${list.registersList[registerId].type}</p>
                            </div>
                            <div class="card-item">
                                <label>Descrição:</label>
                                <p class="green">${list.registersList[registerId].description}</p>
                            </div>
                            <div class="card-item">
                                <label>Data:</label>
                                <p class="green">${list.registersList[registerId].date}</p>
                            </div>
                        </div>
                    </div>`}).join('')}
                </div>
            </div>
        </div>
        `,
        "vehicles": `
        <div class="management">
            <div class="titleBox">
                <h1>Veículos</h1>
            </div>

            ${createSearchBar('Pesquisar Veículo:', 'Digite o nome do veículo...')}

            <div id="sort-container" class="section-container">
                ${(() => {
                    const groupedVehicles = Object.entries(list.vehicleList).reduce((acc, [index, vehicle]) => {
                        if (!acc[vehicle.Class]) {
                            acc[vehicle.Class] = [];
                        }
                        acc[vehicle.Class].push({ name: vehicle.Name, index });
                        return acc;
                    }, {});

                    return Object.keys(groupedVehicles).map(className => `
                        <h2 class="white">${className} <button class="toggle-btn white" onclick="toggleSection('${className}-container')">Expandir</button></h2>
                        <div id="${className}-container">
                            <div class="card-flex" style="justify-content: space-around; gap: 5px;">
                                ${groupedVehicles[className].map(({ name, index }) => `
                                    <div class="new-card" data-name="${name}" style="width: 190px;">
                                        <div class="card-item extended" style="background: transparent;">
                                            <div class="image">
                                                <img src="https://docs.fivem.net/vehicles/${index}.webp" alt="Image" draggable="false" onerror="this.onerror=null; this.src='imgs/addonVehicles/${index}.png'"/>
                                            </div>
                                            <label>${name}</label>
                                            <button class="card-btn green" style="margin-top:10px" onclick="spawnEntity('vehicle', '${index}')">Selecionar</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div> <!-- Fecha card-flex aqui, fora do loop -->
                        </div>
                    `).join('');
                })()}
            </div>
        </div>
        `,
        "weapons": `
        <div class="management">
            <div class="titleBox">
                <h1>Armas</h1>
            </div>

            ${createSearchBar('Pesquisar Arma:', 'Digite o nome da arma...')}

            <div id="sort-container" class="section-container">
                ${Object.keys(list.weaponsList).map(weaponCategory => `
                <h2 class="white">${weaponCategory} <button class="toggle-btn white" onclick="toggleSection('${weaponCategory}-container')">Expandir</button></h2>
                <div id="${weaponCategory}-container">
                    <div class="card-flex" style="justify-content: space-around; gap: 5px;">
                        ${Object.keys(list.weaponsList[weaponCategory]).map(weaponKey => `
                            <div class="new-card" data-name="${list.weaponsList[weaponCategory][weaponKey]}" style="width: 190px;">
                                <div class="card-item extended" style="background: transparent;">
                                    <div class="image">
                                        <img src="https://docs.fivem.net/weapons/${weaponKey.toUpperCase()}.png" alt="Image" draggable="false"/>
                                    </div>
                                    <label>${list.weaponsList[weaponCategory][weaponKey]}</label>
                                    <button class="card-btn green" style="margin-top:10px;" onclick="spawnEntity('weapon', '${weaponKey}')">Selecionar</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`).join('')}
            </div>
        </div>
        `,
        "inventory": `
        <div class="management">
            <div class="titleBox">
                <h1>Inventário</h1>
            </div>

            ${createSearchBar('Pesquisar Itens:', 'Digite o nome do item...')}

            <div id="sort-container" class="section-container">
                <h2 class="white">Itens encontrados: ${Object.keys(list.inventoryList).length}</h2>
                <div class="card-flex" style="justify-content: space-around; gap: 5px;">
                    ${Object.keys(list.inventoryList).map(itemIndex => `
                    <div class="new-card" data-name="${list.inventoryList[itemIndex].name}" style="width: 190px;">
                        <div class="card-item extended" style="background: transparent;">
                            <div class="image">
                                <img src="${config.scriptCfg.Panel.InventoryImagesURL}${list.inventoryList[itemIndex].image}.png"" alt="Image" draggable="false"/>
                            </div>
                            <label>${list.inventoryList[itemIndex].name}</label>
                            <button class="card-btn green" style="margin-top:10px;" onclick="spawnEntity('item', '${itemIndex}')">Selecionar</button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>
        `,
        "graphs": `
        <div class="management">
            <div class="titleBox">
                <h1>Gráficos</h1>
            </div>
            <div class="section-container">
                <h2 class="green">Gráfico de Entrada e Saída <button class="toggle-btn green" onclick="toggleSection('JoinLeft-container')">Expandir</button></h2>
                <div id="JoinLeft-container" style="display:none">
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px">
                        <button class="card-btn white" onclick="updateGraphData('JoinLeft', 24)">24 Horas</button>
                        <button class="card-btn white" onclick="updateGraphData('JoinLeft', 7)">7 Dias</button>
                    </div>
                    <div id="JoinLeft-graph">
                    </div>
                </div>
            </div>
            <div class="section-container">
                <h2 class="yellow">Gráfico de Punições<button class="toggle-btn yellow" onclick="toggleSection('punishments-container')">Expandir</button></h2>
                <div id="punishments-container" style="display:none">
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px">
                        <button class="card-btn white" onclick="updateGraphData('Punishments', 24)">24 Horas</button>
                        <button class="card-btn white" onclick="updateGraphData('Punishments', 7)">7 Dias</button>
                    </div>
                    <div id="Punishments-graph">
                    </div>
                </div>
            </div>
            <div class="section-container">
                <h2 class="blue">Gráfico de Reports<button class="toggle-btn blue" onclick="toggleSection('reports-container')">Expandir</button></h2>
                <div id="reports-container" style="display:none">
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px">
                        <button class="card-btn white" onclick="updateGraphData('Reports', 24)">24 Horas</button>
                        <button class="card-btn white" onclick="updateGraphData('Reports', 7)">7 Dias</button>
                    </div>
                    <div id="Reports-graph">
                    </div>
                </div>
            </div>
            <div class="section-container">
                <h2 class="red">Gráfico de Suspeitos<button class="toggle-btn red" onclick="toggleSection('suspects-container')">Expandir</button></h2>
                <div id="suspects-container" style="display:none">
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px">
                        <button class="card-btn white" onclick="updateGraphData('Suspects', 24)">24 Horas</button>
                        <button class="card-btn white" onclick="updateGraphData('Suspects', 7)">7 Dias</button>
                    </div>
                    <div id="Suspects-graph">
                    </div>
                </div>
            </div>
            <div class="section-container">
                <h2 class="white">Gráfico de Registros<button class="toggle-btn white" onclick="toggleSection('registers-container')">Expandir</button></h2>
                <div id="registers-container" style="display:none">
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px">
                        <button class="card-btn white" onclick="updateGraphData('Registers', 24)">24 Horas</button>
                        <button class="card-btn white" onclick="updateGraphData('Registers', 7)">7 Dias</button>
                    </div>
                    <div id="Registers-graph">
                    </div>
                </div>
            </div>
        </div>
        `,
        "config": `
        <div class="management">
            <div class="titleBox">
                <h1>Configurações</h1>
            </div>

            <div class="section-container" id="tutorial_start">
                <h2 style="border-bottom: none; margin-bottom: 0px">Tutorial do Painel <button class="toggle-btn white" onclick="startTutorial()">Iniciar</button></h2>
            </div>

            <div class="section-container">
                <h2 class="blue">Interface <button class="toggle-btn blue" onclick="toggleSection('interface-container')">Expandir</button></h2>
                <div id="interface-container" style="display:none">

                    <div class="config-container">
                        <label for="notify-toggle">Ativar Notificações</label>
                        <label class="switch">
                            <input type="checkbox" id="notify-toggle" ${config.notify ? 'checked' : ''} onchange="toggleNotify()">
                            <p class="slider"></p>
                        </label>
                    </div>

                    <div class="config-container">
                        <label for="realTimeNotify-toggle">Notificações em Tempo Real</label>
                        <label class="switch">
                            <input type="checkbox" id="realTimeNotify-toggle" ${config.realTimeNotify ? 'checked' : ''} onchange="toggleRealTimeNotify()">
                            <p class="slider"></p>
                        </label>
                    </div>

                    <div class="config-container">
                        <label for="sounds-toggle">Ativar Som</label>
                        <label class="switch">
                            <input type="checkbox" id="sounds-toggle" ${config.sounds ? 'checked' : ''} onchange="toggleSounds()">
                            <p class="slider"></p>
                        </label>
                    </div>
                    <h2 class="green">Layout</h2>
                    ${generateColorInputs()}

                </div>
            </div>

            ${checkPermissions(myId, "staff_editor") ? `
            <div class="section-container">
                <h2 class="green">Staff Editor <button class="toggle-btn green" onclick="toggleSection('staffEditor-container')">Expandir</button></h2>
                <div id="staffEditor-container" style="display:none">
                    
                    <label for="searchBar">Pesquisar Staff:</label>
                    <input type="text" id="searchBar" class="search-bar" placeholder="Digite o id ou tipo do staff...">

                    ${createSort({id: "Staff Id"})}
                    <button class="card-btn green" style="margin-bottom:30px" onclick="addNewStaff()">Adicionar Novo Staff</button>
                    <div id="sort-container">
                        ${Object.keys(list.staffsList).map(staffId => {
                        return`
                        <div class="new-card" data-id="${staffId}" data-type="${list.staffsList[staffId].type}">
                            <div class="card-grid">
                                <div class="card-item">
                                    <label>Staff Id:</label>
                                    <p class="green">${staffId}</p>
                                </div>
                                <div class="card-item">
                                    <label>Staff Type:</label>
                                    <p class="green">${list.staffsList[staffId].type}</p>
                                </div>
                                <div class="card-item">
                                    <label>Permissions:</label>
                                    <p class="green">${list.staffsList[staffId].permissions.join('<br>')}</p>
                                </div>
                                <div class="card-item">
                                    <button class="card-btn red" onclick="remStaff(${staffId})">Remover Staff</button>
                                </div>
                            </div>
                        </div>`}).join('')}
                    </div>
                </div>
            </div>` : ''}

            ${checkPermissions(myId, "scriptcfg_editor") ? `
            <div class="section-container">
                <h2 class="red">Script Config <button class="toggle-btn red" onclick="toggleSection('scriptCfg-container')">Expandir</button></h2>
                <div id="scriptCfg-container" style="display:none">
                    <div style="display:flex; justify-content:center; align-items: center;margin-top: 30px">
                        ${createCardBtn('yellow','Salvar Configurações', "saveConfig")}
                    </div>

                    <h2 class="green">Painel</h2>
                    <div class="config-container">
                        <label for="bans-toggle">Liberar Banimentos</label>
                        <label class="switch">
                            <input type="checkbox" id="bans-toggle" ${config.scriptCfg.Panel.EnableBans ? 'checked' : ''} onchange="config.scriptCfg.Panel.EnableBans = this.checked">
                            <p class="slider"></p>
                        </label>
                    </div>
                    <div class="config-container">
                        <label for="EnableScreenshot-toggle">Liberar Screenshot</label>
                        <label class="switch">
                            <input type="checkbox" id="EnableScreenshot-toggle" ${config.scriptCfg.Panel.EnableScreenshot ? 'checked' : ''} onchange="config.scriptCfg.Panel.EnableScreenshot = this.checked">
                            <p class="slider"></p>
                        </label>
                    </div>
                    <div class="config-container">
                        <label for="command">Comando do Painel (restart)</label>
                        <input type="text" id="command" value="${config.scriptCfg.Panel.Command}" 
                            onchange="config.scriptCfg.Panel.Command = this.value">
                    </div>
                    <div class="config-container">
                        <label for="inventory-images-url">URL das Imagens do Inventário</label>
                        <input type="text" id="inventory-images-url" value="${config.scriptCfg.Panel.InventoryImagesURL}" 
                            onchange="config.Panel.InventoryImagesURL = this.value">
                    </div>
                    <h2 class="red">Otimização</h2>
                    <div class="config-container">
                        <label style="color: var(--red)" for="CollectOfflinePlayers-toggle">Coletar Jogadores Offline</label>
                        <label class="switch">
                            <input type="checkbox" id="CollectOfflinePlayers-toggle" ${config.scriptCfg.Panel.CollectOfflinePlayers ? 'checked' : ''} onchange="config.scriptCfg.Panel.CollectOfflinePlayers = this.checked">
                            <p class="slider"></p>
                        </label>
                    </div>
                    <div class="config-container">
                        <label style="color: var(--red)" for="MaxRegisters">Máximo de registros no painel</label>
                        <input type="text" id="MaxRegisters" value="${config.scriptCfg.Panel.MaxRegisters}" 
                            onchange="config.scriptCfg.Panel.MaxRegisters = this.value">
                    </div>
                    <div class="config-container">
                        <label style="color: var(--red)" for="MaxChatMessages">Máximo de mensagens em chats</label>
                        <input type="text" id="MaxChatMessages" value="${config.scriptCfg.Panel.MaxChatMessages}" 
                            onchange="config.scriptCfg.Panel.MaxChatMessages = this.value">
                    </div>
                    <div class="config-container">
                        <label style="color: var(--red)" for="MaxSuspects">Máximo de suspeitos</label>
                        <input type="text" id="MaxSuspects" value="${config.scriptCfg.Panel.MaxSuspects}" 
                            onchange="config.scriptCfg.Panel.MaxSuspects = this.value">
                    </div>
                    <div class="config-container">
                        <label for="AutoRemoveReportsAfter">Remover reports automaticamente após (dias):</label>
                        <input type="text" id="AutoRemoveReportsAfter" value="${config.scriptCfg.Panel.AutoRemoveReportsAfter}" 
                            onchange="config.Panel.AutoRemoveReportsAfter = this.value">
                    </div>
                    <h2 class="yellow">Suspeitos</h2>
                    <div class="config-container">
                        <label for="suspects-bans-toggle">Banir ao atingir Máximo de Suspeita</label>
                        <label class="switch">
                            <input type="checkbox" id="suspects-bans-toggle" ${config.scriptCfg.Suspect.SuspectActions.Ban ? 'checked' : ''} onchange="config.scriptCfg.Suspect.SuspectActions.Ban = this.checked">
                            <p class="slider"></p>
                        </label>
                    </div>
                    <div class="config-container">
                        <label for="suspects-kick-toggle">Expulsar ao atingir Máximo de Suspeita</label>
                        <label class="switch">
                            <input type="checkbox" id="suspects-kick-toggle" ${config.scriptCfg.Suspect.SuspectActions.Kick ? 'checked' : ''} onchange="config.scriptCfg.Suspect.SuspectActions.Kick = this.checked">
                            <p class="slider"></p>
                        </label>
                    </div>
                    <div class="config-container">
                        <label for="suspects-max">Máximo de Suspeita</label>
                        <input type="text" id="suspects-max" value="${config.scriptCfg.Suspect.SuspectActions.MaxSuspectCount}" onchange="config.scriptCfg.Suspect.SuspectActions.MaxSuspectCount = this.value">
                    </div>
                    <h2 class="blue">WebHooks</h2>
                    ${Object.keys(config.scriptCfg.WebHooks).map((key) => {
                        return `
                            <div class="config-container">
                                <label for="webhook-${key}">${key} WebHook</label>
                                <input type="text" id="webhook-${key}" value="${config.scriptCfg.WebHooks[key]}" 
                                    onchange="config.scriptCfg.WebHooks['${key}'] = this.value">
                            </div>
                        `;
                    }).join('')}
                    <h2 class="red">BlackList</h2>
                    <div class="config-container">
                        <label for="suspects-vehicles">Veículos na BlackList</label>
                        <input type="text" id="blacklist-vehicles" value="${config.scriptCfg.Suspect.Vehicles}" onchange="config.scriptCfg.Suspect.Vehicles = this.value">
                    </div>
                    <div class="config-container">
                        <label for="suspects-weapons">Armas na BlackList</label>
                        <input type="text" id="blacklist-weapons" value="${config.scriptCfg.Suspect.Weapons}" onchange="config.scriptCfg.Suspect.Weapons = this.value">
                    </div>
                    <div class="config-container">
                        <label for="blacklist-objects">Props na BlackList</label>
                        <input type="text" id="blacklist-objects" value="${config.scriptCfg.Suspect.Objects}" onchange="config.scriptCfg.Suspect.Objects = this.value">
                    </div>
                </div>
            </div>` : ''}
        </div>
        `,
    }

    return Containers[id]
}

async function saveConfig() {
    if (!checkPermissions(myId, "scriptcfg_editor")) {
        showNotification('error', "Sem permissão.");
    }
    var confirm = await showPopup('message',`Você tem certeza que quer alterar o Cfg do script?`,`Nenhuma alteração poderá ser refeita.`);
    if (confirm) {
        $.post('http://arc.Panel/SaveConfig', JSON.stringify(config.scriptCfg));
        showNotification('success','Config alterado com Sucesso!')
    }
}

function toggleNotify() {
    config.notify = !config.notify;
    document.getElementById("notify-toggle").checked = config.notify;
}

function toggleRealTimeNotify() {
    config.realTimeNotify = !config.realTimeNotify;
    document.getElementById("realTimeNotify-toggle").checked = config.realTimeNotify;
}

function toggleSounds() {
    config.sounds = !config.sounds;
    document.getElementById("sounds-toggle").checked = config.sounds;
}

function buildTutorial() {
    if (document.getElementById('tutorial-container')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    overlay.id = 'overlay'
    body.appendChild(overlay);

    const tutorialDiv = document.createElement('div');
    tutorialDiv.id = 'tutorial-container';
    tutorialDiv.classList.add('tutorial-container');

    tutorialDiv.innerHTML = `
        <div class="title">
            <p id="tutorial_step"></p>
            <h1 id="tutorial_title"></h1>
            <i id="tutorial_leave" class="fa-solid fa-xmark"></i>
        </div>
        <div class="content">
            <label id="tutorial_content"></label>
        </div>
        <div class="buttons" id="tutorial_buttons"></div>
    `;

    body.appendChild(tutorialDiv);
}


function startTutorial() {
    buildTutorial();
    const overlay = document.getElementById('overlay')
    const tutorialDiv = document.getElementById('tutorial-container');
    const tutorialTitle = document.getElementById('tutorial_title');
    const tutorialContent = document.getElementById('tutorial_content');
    const tutorialStep = document.getElementById('tutorial_step');
    const tutorialButtons = document.getElementById('tutorial_buttons');
    const tutorialLeave = document.getElementById('tutorial_leave')
    tutorialLeave.addEventListener('click', function() {
        if (tutorialDiv) {
            tutorialDiv.remove();
            if (document.querySelector('.highlight')) {
                document.querySelector('.highlight').classList.remove('highlight');
            }
        }
        if (overlay) {
            overlay.remove();
        }
    });

    let currentStep = 0;

    function nextStep() {
        currentStep++;
        showStep(currentStep)
    }

    function previousStep() {
        currentStep--;
        showStep(currentStep)
    }

    const tutorialSteps = [
        {
            title: `Olá, ${myName}!`,
            content: 'Para sair do tutorial, pressione o X acima.',
            attachTo: { element: '#tutorial_start', on: 'bottom' },
            buttons: [
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_dashboard').click();
                        setTimeout(() => nextStep(), 500);
                    }
                },
            ]
        },
        {
            title: `Lista de Jogadores.`,
            content: 'Esta seção mostra a quantidade de jogadores atualmente online no servidor. Clique nela caso queira expandir a lista de jogadores',
            attachTo: { element: '#playerList', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_config').click();
                        setTimeout(() => previousStep(), 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => nextStep()
                },
            ]
        },
        {
            title: 'Lista de Admins.',
            content: 'Esta seção mostra a quantidade de admins atualmente online no servidor. Clique nela caso queira expandir a lista de admins.',
            attachTo: { element: '#adminsList', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => previousStep()
                },
                {
                    text: 'Próximo',
                    action: () => nextStep()
                },
            ]
        },
        {
            title: 'Reports Registrados.',
            content: 'Esta seção mostra a quantidade de reports registrados no servidor. Clique nela caso queira expandir a lista de reports.',
            attachTo: { element: '#list.reportsList', on: 'left' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => previousStep()
                },
                {
                    text: 'Próximo',
                    action: () => nextStep()
                },
            ]
        },
        {
            title: 'Suspeitos Registrados.',
            content: 'Esta seção mostra a quantidade de suspeitos registrados no servidor. Clique nela caso queira expandir a lista de suspeitos.',
            attachTo: { element: '#list.suspectsList', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => previousStep()
                },
                {
                    text: 'Próximo',
                    action: () => nextStep()
                },
            ]
        },
        {
            title: 'Logs Registradas.',
            content: 'Esta seção mostra a quantidade de logs do painel registradas. Clique nela caso queira ver mais informações sobre as logs.',
            attachTo: { element: '#logsList', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => previousStep()
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_messages').click();
                        setTimeout(() => nextStep(), 500);
                    }
                },
            ]
        },
        {
            title: `Chat Admin.`,
            content: 'Aqui você poderá enviar mensagens para toda a administração.',
            attachTo: { element: '#message-creator', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_dashboard').click();
                        setTimeout(() => previousStep(), 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_self').click();
                        setTimeout(() => nextStep(), 500);
                    }
                },
            ]
        },
        {
            title: `Funções.`,
            content: 'Caso queira encontrar alguma função, clique em expandir em alguma das categorias e procure por ela. Algumas funções podem estar restritas devido à falta de permissão. Entretanto, caso tenha a permissão, você poderá acessar a função.',
            attachTo: { element: '#functions-Data', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_messages').click();
                        setTimeout(() => previousStep(), 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_players').click();
                        setTimeout(() => nextStep(), 500);
                    }
                },
            ]
        },
        {
            title: `Pesquisar jogadores.`,
            content: 'Para encontrar o jogador, basta pequisar pelo nome ou id na barra de pesquisa.',
            attachTo: { element: '#search-bar', on: 'bottom' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_self').click();
                        setTimeout(() => previousStep(), 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => nextStep()
                },
            ]
        },
        {
            title: `Ordenar jogadores.`,
            content: 'Para ordenar os jogadores em ID, online, admins ou banidos, basta clicar em "Ordenar por" e selecionar a opção desejada, após isso selecione a ordem e clique na lupa para aplicar.',
            attachTo: { element: '#sort-Data', on: 'bottom' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => previousStep()
                },
                {
                    text: 'Próximo',
                    action: () => {nextStep(); toggleSection('collectedPlayers-container', true, true);}
                },
            ]
        },
        {
            title: `Jogadores Coletados.`,
            content: 'Ao clicar em expandir, todos os jogadores com Whitelist serão exibidos. Clique em "Informações" para obter mais informações sobre o jogador.',
            attachTo: { element: '#sort-container', on: 'bottom' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => previousStep()
                },
                {
                    text: 'Próximo',
                    action: () => {nextStep(); toggleSection('currentPlayer-container', true, true);}
                },
            ]
        },
        {
            title: `Jogador Atual.`,
            content: 'Ao clicar em expandir, todas as informações do jogador coletado aparecerão aqui. Arraste para baixo caso queira interagir com o jogador.',
            attachTo: { element: '#currentPlayer-cont', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {previousStep(); toggleSection('collectedPlayers-container', true, true);}
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_reports').click();
                        setTimeout(() => {
                            nextStep();
                            toggleSection('nonConcludedReports-container', true, true);
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Reports não Concluídos.`,
            content: 'Ao clicar em expandir, você conseguirá vizualizar todos os reports não concluídos. Clicando em "Abrir Chat", você poderá conversar com o player, concluir atendimento e vizualizar as imagens caso exista.',
            attachTo: { element: '#sort-container', on: 'bottom' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_players').click();
                        setTimeout(() => {
                            previousStep();
                            toggleSection('currentPlayer-container', true, true);
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {nextStep(); toggleSection('ConcludedReports-container', true, true)}
                },
            ]
        },
        {
            title: `Reports Concluídos.`,
            content: 'Ao clicar em expandir, você conseguirá vizualizar todos os reports já concluídos. Clicando em "Abrir Chat", você poderá ver o histórico de conversas com o player e vizualizar as imagens caso exista.',
            attachTo: { element: '#sort-container2', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        previousStep();
                        toggleSection('nonConcludedReports-container', true, true);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_suspects').click();
                        setTimeout(() => {
                            nextStep();
                            toggleSection('suspectsFound-container', true, true);
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Suspeitos.`,
            content: 'Ao clicar em expandir, todos os suspeitos coletados aparecerão aqui. Clique em "Mais Informações" para realizar ações com o suspeito e clique no nome dele para abrir as informações completas do jogador.',
            attachTo: { element: '#sort-container', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_reports').click();
                        setTimeout(() => {
                            previousStep();
                            toggleSection('ConcludedReports-container', true, true)
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_resources').click();
                        setTimeout(() => {
                            nextStep();
                            toggleSection('sort-container', true, true);
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Resources.`,
            content: 'Nessa aba, todos os resources encontrados no servidor aparecerão. Caso você tenha a permissão para gerenciá-los, você poderá realizar as ações disponíveis.',
            attachTo: { element: '#sort-container', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_suspects').click();
                        setTimeout(() => {
                            previousStep();
                            toggleSection('suspectsFound-container', true, true);
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_bans').click();
                        setTimeout(() => {
                            nextStep();
                            toggleSection('sort-container', true, true);
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Banimentos.`,
            content: 'Ao clicar em expandir, todos os banimentos registrados aparecerão aqui. Clique em "Mais Informações" para realizar ações com o jogador e para vizualizar todas as suas informações.',
            attachTo: { element: '#sort-container', on: 'bottom' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_resources').click();
                        setTimeout(() => {
                            previousStep();
                            toggleSection('sort-container', true, true);
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_logs').click();
                        setTimeout(() => {
                            nextStep();
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Registros.`,
            content: 'Nessa aba, todos os registros realizados pelos jogadores e admins aparecerão aqui. Clique em expandir no registro de importância X para vizualizar os detalhes.',
            attachTo: { element: '.management', on: 'right' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_bans').click();
                        setTimeout(() => {
                            previousStep();
                            toggleSection('sort-container', true, true);
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_vehicles').click();
                        setTimeout(() => {
                            nextStep();
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Veículos.`,
            content: 'Nessa aba, todos os veículos configurados no script aparecerão aqui. Pesquise o nome do veículo na Search-Bar e clique em "Selecionar" para realizar a ação.',
            attachTo: { element: '.management', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_logs').click();
                        setTimeout(() => {
                            previousStep();
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_weapons').click();
                        setTimeout(() => {
                            nextStep();
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Armas.`,
            content: 'Nessa aba, todas as armas configurados no script aparecerão aqui. Pesquise o nome da arma na Search-Bar e clique em "Selecionar" para realizar a ação.',
            attachTo: { element: '.management', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_vehicles').click();
                        setTimeout(() => {
                            previousStep();
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_inventory').click();
                        setTimeout(() => {
                            nextStep();
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Inventário.`,
            content: 'Nessa aba, todas os itens configurados no script irão aparecer. Pesquise o nome do item na Search-Bar e clique em "Selecionar" para realizar a ação.',
            attachTo: { element: '.management', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_weapons').click();
                        setTimeout(() => {
                            previousStep();
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_graphs').click();
                        setTimeout(() => {
                            nextStep();
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Gráficos.`,
            content: 'Nessa aba, você poderá ver todos os gráficos gerados pelo script. Clique em "Expandir" no gráfico desejado e escolha o período a ser exibido.',
            attachTo: { element: '.management', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_inventory').click();
                        setTimeout(() => {
                            previousStep();
                        }, 500);
                    }
                },
                {
                    text: 'Próximo',
                    action: () => {
                        document.getElementById('sidebar_config').click();
                        setTimeout(() => {
                            nextStep();
                            toggleSection('interface-container', true, true);
                        }, 500);
                    }
                },
            ]
        },
        {
            title: `Configurações.`,
            content: 'Escolha tudo de acordo com a sua preferência. Aqui você poderá alterar toda a interface do painel, bem como escolher as configurações da notificação e, caso tenha permissão, alterar as configurações do Script.',
            attachTo: { element: '.management', on: 'top' },
            buttons: [
                {
                    text: 'Anterior',
                    action: () => {
                        document.getElementById('sidebar_graphs').click();
                        setTimeout(() => {
                            previousStep();
                        }, 500);
                    }
                },
            ]
        },
    ];    

    function showStep(stepIndex) {
        const step = tutorialSteps[stepIndex];
        if (!step) return;
    
        const previousElement = document.querySelector('.highlight');
        if (previousElement) {
            previousElement.classList.remove('highlight');
        }
    
        tutorialTitle.textContent = step.title;
        tutorialContent.textContent = step.content;
        tutorialStep.textContent = `${stepIndex + 1}/${tutorialSteps.length}`;
    
        tutorialButtons.innerHTML = '';
    
        step.buttons.forEach((buttonConfig) => {
            const button = document.createElement('button');
            button.textContent = buttonConfig.text;
            button.onclick = buttonConfig.action;
            tutorialButtons.appendChild(button);
        });
    
        const attachToElement = document.querySelector(step.attachTo.element);
    
        if (attachToElement && tutorialDiv) {
            
            attachToElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const rect = attachToElement.getBoundingClientRect();
            const tutorialWidth = tutorialDiv.offsetWidth;
            const tutorialHeight = tutorialDiv.offsetHeight;
    
            let top, left;
    
            switch (step.attachTo.on) {
                case 'top':
                    top = rect.top - tutorialHeight - 10;
                    left = rect.left + (rect.width / 2) - (tutorialWidth / 2);
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - (tutorialHeight / 2);
                    left = rect.right + 10;
                    break;
                case 'bottom':
                    top = rect.bottom + 10;
                    left = rect.left + (rect.width / 2) - (tutorialWidth / 2);
                    break;
                case 'left':
                    top = rect.top + (rect.height / 2) - (tutorialHeight / 2);
                    left = rect.left - tutorialWidth - 10;
                    break;
                default:
                    console.warn(`Posição '${step.attachTo.on}' não reconhecida.`);
                    return;
            }
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            if (top < 0) {
                top = 10;
            } else if (top + tutorialHeight > windowHeight) {
                top = windowHeight - tutorialHeight - 10;
            }
            if (left < 0) {
                left = 10;
            } else if (left + tutorialWidth > windowWidth) {
                left = windowWidth - tutorialWidth - 10;
            }
            tutorialDiv.style.top = `${top}px`;
            tutorialDiv.style.left = `${left}px`;
            attachToElement.classList.add('highlight');
        }
    }

    showStep(currentStep);
}

/////////////////////////////

async function remStaff(staffId) {
    if (staffId === myId) {
        showNotification('error', `Não é possível remover o seu ID.`);
        return
    }
    var confirm = await showPopup('message',`Deseja remover o Staff de id ${staffId}?`,`Tipo de Staff: ${list.staffsList[staffId].type}`);
    if (confirm) {
        showNotification('success', `Staff de ID "${staffId}" removido.`);
        $.post('http://arc.Panel/remStaff', JSON.stringify({staffId}));
        setTimeout(() => {
            currentContainer = '';
            document.getElementById('sidebar_config').click();
            playAudio('click'); 
            setTimeout(() => {
                toggleSection('staffEditor-container', true, true);
            }, 100);
        }, 500);
    }
}

async function addNewStaff() {
    var newStaffId = await showPopup('input',`Coloque o Id do novo Staff`,"");
    newStaffId = parseInt(newStaffId);
    if (!newStaffId) {
        showNotification('error', `Não foi possível adicionar esse ID.`);
        return;
    }

    var newStaffType = await showPopup('input',`Coloque o tipo do novo Staff`,"Exemplo: Dono, Desenvolvedor, Administrador...");
    if (!newStaffType) {
        newStaffType = 'Admin';
        showNotification('success', `Tipo de staff definido para ${newStaffType}.`);
    }

    var newStaffPermissions = await showPermissionsPopup();

    if (!newStaffPermissions || newStaffPermissions.length === 0) {
        showNotification('error', `Não foi possível configurar as permissões para esse Staff.`);
        return;
    }

    var confirm = await showPopup('message',`[${newStaffId}] - ${newStaffType}`,"Deseja Concluir a Ação?");
    if (confirm) {
        $.post('http://arc.Panel/addStaff', JSON.stringify({newStaffId, newStaffType, newStaffPermissions}));
        setTimeout(() => {
            currentContainer = '';
            document.getElementById('sidebar_config').click();
            playAudio('click'); 
            setTimeout(() => {
                toggleSection('staffEditor-container', true, true);
            }, 100);
        }, 500);
        sendLog(3, `Adicionou o staff de id ${newStaffId} do tipo ${newStaffType} com as permissões: ${newStaffPermissions}.`);
    }
}

const permList = {
    "Moderação": {
        "super_admin": {name: "Super Admin", args: "Inclui: Todas as permissões.", color: "red"},
        "scriptcfg_editor": {name: "Editar Cfg do Script", color: "red"},
        "staff_editor": {name: "Editar Staffs", args: "Inclui: Adicionar Staff. Remover Staff.", color: "red"},
        "resource_manage": {name: "Gerenciar Resources", args: "Inclui: Start resource. Stop resource.", color: "red"},
        "announce_permission": {name: "Anúncios", args: "Inclui: Anúncio geral. Anúncio Chat Staff", color: "red"},
        "unwl_permission": {name: "Remover WL", color: "red"},
    },

    "Punições": {
        "ban_player": {name: "Banir Jogador", color: "orange"},
        "unban_player": {name: "Desbanir Jogador", color: "orange"},
        "kick_player": {name: "Expulsar Jogador", color: "orange"},
        "arrest_player": {name: "Prender Jogador", color: "orange"},
        "freeze_player": {name: "Congelar Jogador", color: "orange"},
    },

    "Groups": {
        "groups_permissions": {name: "Gerenciar Groups", args: "Inclui: Adicionar serviço a um jogador. Remover serviço de um jogador.", color: "aqua"},
    },

    "Teleport": {
        "teleport_permissions": {name: "Permissões de teleport", args: "Inclui: Teleportar até um jogador. Teleportar jogador até mim. Teleportar até Cds. Teleportar até waypoint.", color: "hotpink"},
    },

    "Dinheiro": {
        "give_money": {name: "Dar dinheiro", color: "green"},
        "remove_money": {name: "Remover dinheiro.", color: "green"},
    },

    "Funções": {
        "basic_permissions": {name: "Permissões básicas", args: "Inclui: Reviver, noclip, trocar skin, taser, adicionar colete, morrer, matar, spectar, enviar notificação, freecam e wall.", color: "cornflowerblue"},
        "dev_permissions": {name: "Permissões de Dev", args: "Inclui: Todas funções de desenvolvedor.", color: "cornflowerblue"},
        "time_permissions": {name: "Permissões de Tempo", args: "Inclui: Mudar horario. Mudar Clima", color: "cornflowerblue"},
        "hack_permissions": {name: "Permissões de Hack", args: "Inclui: Todas funções de hack.", color: "cornflowerblue"},
    },

    "Armas": {
        "weapons_permissions": {name: "Permissões de armas", args: "Inclui: Spawnar arma. Limpar armas. Dar arma.", color: "aqua"},
    },

    "Item": {
        "item_permissions": {name: "Permissões de itens", args: "Inclui: Dar item. Remover item.", color: "slateblue"},
    },

    "Veículos": {
        "manage_vehicle": {name: "Gerenciar Veículos", args: "Inclui: Remover veículo de um jogador. Adicionar veículo a um jogador.", color: "yellow"},
        "vehicle_permissions": {name: "Permissões de veículos", args: "Inclui: Spawnar, entrar, trancar, destrancar, consertar, maximizar, quebrar, mudar cor, limpar e deletar veículo.", color: "yellow"},
    },
}

async function showPermissionsPopup() {
    return new Promise((resolve) => {
        const popup = document.getElementById('popup');
        const messageElement = document.getElementById('popup-message');
        const titleElement = document.getElementById('popup-title');
        const inputField = document.getElementById('popup-input');

        titleElement.textContent = "Selecione as permissões";
        messageElement.style.display = 'none';
        inputField.style.display = 'none';

        let leftColumnHtml = '';
        let middleColumnHtml = '';
        let rightColumnHtml = '';
        let columnIndex = 0;

        // Gerar HTML das permissões
        Object.keys(permList).forEach(category => {
            let categoryHtml = `
                <div class="permissions_add">
                    <h3 style="margin: 0 0 10px 0; font-weight: bold;">${category}</h3>
            `;
            Object.keys(permList[category]).forEach(perm => {
                const { name, color, args } = permList[category][perm];
                categoryHtml += `
                    <div class="permission-item" style="margin: 5px 0; position: relative;">
                        <input type="checkbox" style="cursor:pointer" id="perm_${perm}" value="${perm}">
                        <span style="font-family: 'Poppins', sans-serif; color:${color}">${name}</span>
                        ${args ? `<div class="permission-args">${args}</div>` : ""}
                    </div>
                `;
            });
            categoryHtml += `</div>`;

            if (columnIndex === 0) {
                leftColumnHtml += categoryHtml;
            } else if (columnIndex === 1) {
                middleColumnHtml += categoryHtml;
            } else {
                rightColumnHtml += categoryHtml;
            }
            columnIndex = (columnIndex + 1) % 3;
        });

        messageElement.innerHTML = `
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1; padding-right: 10px;">${leftColumnHtml}</div>
                <div style="flex: 1; padding: 0 10px;">${middleColumnHtml}</div>
                <div style="flex: 1; padding-left: 10px;">${rightColumnHtml}</div>
            </div>
            <button id="choosePresetButton" class="popup-btn" style="margin-top: 10px; background-color: var(--blue)">Escolher Preset</button>
            <button id="addPresetButton" class="popup-btn" style="margin-left: 5px; background-color: var(--yellow)">Adicionar Preset</button>
            <div id="presetsContainer" style="display: none; margin-top: 10px;"></div>
        `;
        messageElement.style.display = 'block';
        popup.style.display = 'flex'

        document.getElementById('choosePresetButton').onclick = async function () {
            showPresetsList(); 
        };

        document.getElementById('addPresetButton').onclick = function () {
            addPresets();
        };

        document.getElementById('confirmButton').onclick = function () {
            const selectedPermissions = [];
            let allSelected = true;

            Object.keys(permList).forEach(category => {
                Object.keys(permList[category]).forEach(perm => {
                    const checkbox = document.getElementById(`perm_${perm}`);
                    if (checkbox.checked) {
                        selectedPermissions.push(perm);
                    } else {
                        if (perm !== 'super_admin') {
                            allSelected = false;
                        }
                    }
                });
            });

            if (selectedPermissions.includes("super_admin")) {
                resolve(["super_admin"]);
            } else if (allSelected) {
                resolve(["super_admin"]);
            } else {
                resolve(selectedPermissions);
            }

            hidePopup();
        };

        document.getElementById('cancelButton').onclick = function () {
            hidePopup();
            resolve(null);
        };

        function addPresets() {
            const presetsContainer = document.getElementById('presetsContainer');
            presetsContainer.style.display = 'block';
            presetsContainer.innerHTML = `
                <input type="text" id="presetNameInput" class="search-bar" placeholder="Digite o nome do preset" style="margin-bottom: 10px; width: 100%;">
                <button id="savePresetButton" class="popup-btn confirm-btn">Salvar Preset</button>
            `;
        
            document.getElementById('savePresetButton').onclick = function () {
                const presetName = document.getElementById('presetNameInput').value.trim();
                if (!presetName) {
                    showNotification('error', 'Por favor, insira um nome para o preset.', null, true)
                    return;
                }

                const selectedPermissions = [];
                let allSelected = true;
        
                Object.keys(permList).forEach(category => {
                    Object.keys(permList[category]).forEach(perm => {
                        const checkbox = document.getElementById(`perm_${perm}`);
                        if (checkbox.checked) {
                            selectedPermissions.push(perm);
                        } else {
                            if (perm !== 'super_admin') {
                                allSelected = false;
                            }
                        }
                    });
                });
        
                let permissionsToSave = selectedPermissions;
                if (selectedPermissions.includes("super_admin") || allSelected) {
                    permissionsToSave = ["super_admin"];
                }
        
                if (permissionsToSave.length === 0) {
                    showNotification('error', 'Nenhuma permissão adicionada.', null, true)
                    presetsContainer.style.display = 'none';
                    presetsContainer.innerHTML = '';
                    return
                }

                $.post('http://arc.Panel/AddPreset', JSON.stringify({
                    name: presetName,
                    permissions: permissionsToSave
                }));
        
                presetsContainer.style.display = 'none';
                presetsContainer.innerHTML = '';
            };
        }
        
        async function showPresetsList() {
            const presetsContainer = document.getElementById('presetsContainer');
            const presets = config.scriptCfg.AdminsPreset;
            presetsContainer.innerHTML = '';

            Object.keys(presets).forEach(preset => {
                const button = document.createElement('button');
                button.className = 'popup-btn confirm-btn';
                button.style.margin = '5px'
                button.textContent = preset;
                button.onclick = function () {
                    applyPresetPermissions(presets[preset]);
                };
                presetsContainer.appendChild(button);
            });

            presetsContainer.style.display = 'block';
        }

        function applyPresetPermissions(permissions) {
            Object.keys(permList).forEach(category => {
                Object.keys(permList[category]).forEach(perm => {
                    const checkbox = document.getElementById(`perm_${perm}`);
                    checkbox.checked = false;
                });
            });

            permissions.forEach(perm => {
                const checkbox = document.getElementById(`perm_${perm}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    });
}

//////////

const cssVariables = [
    { name: 'Cor de Fundo', index: '--bg-color', default: 'rgba(0, 3, 14, 0.85)' },
    { name: 'Cor da Seção', index: '--container-section-bg', default: 'rgba(18, 24, 61, 0.8)' },
    { name: 'Cor do Hover em Nav', index: '--nav-svg-hover-color', default: 'rgb(18, 24, 61)' },
    { name: 'Cor do Ícone em Nav', index: '--nav-svg-color', default: 'rgb(220, 220, 220)' },
    { name: 'Cor do Texto em Nav', index: '--nav-p-color', default: 'rgb(210, 210, 210)' },

    { name: 'Cor Verde', index: '--green', default: '#00ff99' },
    { name: 'Cor Azul', index: '--blue', default: '#15e4ff' },
    { name: 'Cor Vermelha', index: '--red', default: '#ff5c47' },
    { name: 'Cor Amarela', index: '--yellow', default: '#fcce00' },
];

function rgbToHex(rgb) {
    const rgbValues = rgb.match(/\d+/g);
    if (rgbValues) {
        return `#${((1 << 24) + (parseInt(rgbValues[0]) << 16) + (parseInt(rgbValues[1]) << 8) + parseInt(rgbValues[2])).toString(16).slice(1)}`;
    }
    return rgb;
}

function generateColorInputs() {
    return cssVariables.map(variable => {
        const defaultValue = variable.default.startsWith('rgb') ? rgbToHex(variable.default) : variable.default;
        return ` <div class="config-container" id="layout-container">
            <label for="${variable.index}">${variable.name}</label>
            <input type="color" id="${variable.index}" value="${defaultValue}" onchange="updateRootVar('${variable.index}', this.value)">
            <button class="toggle-btn white" onclick="resetToDefault('${variable.index}', '${variable.default}')">Restaurar Padrão</button>
        </div>
    `}).join('');
}

function updateRootVar(varName, value) {
    document.documentElement.style.setProperty(varName, value);
}

function resetToDefault(varName, defaultValue) {
    document.documentElement.style.setProperty(varName, defaultValue);
    const newDefaultValue = defaultValue.startsWith('rgb') ? rgbToHex(defaultValue) : defaultValue;
    const inputElement = document.getElementById(varName);
    if (inputElement) {
        inputElement.value = newDefaultValue;
    }
}

//////////

let btnActive = {};

function NoClip(btnId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/NoClip', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `Noclip ${toggle ? 'ativado. (Use o Scroll Para alterar a velocidade)' : 'desativado'}`);
    sendLog(11, `Noclip ${toggle ? 'ativado' : 'desativado'}.`)
}

async function Wall(btnId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    var wallDist
    var lines

    if (toggle) {
        wallDist = await showPopup('input',`Coloque a distância do Wall`,"Padrão = 500");
        wallDist = parseInt(wallDist)
        if (!wallDist) {
            wallDist = 500
        }
        showNotification('success', `Distância definida para ${wallDist}`);
        lines = await showPopup('message',`Ativar as linhas?`,"Padrão = NÃO");
    }

    $.post('http://arc.Panel/Wall', JSON.stringify({toggle, wallDist, lines}));
    showNotification(toggle ? 'success' : 'error', `Wall ${toggle ? 'ativado' : 'desativado'}`);
    sendLog(11, `Wall ${toggle ? 'ativado' : 'desativado'}.`)
    if (toggle && lines) {
        showNotification('success', `Linhas ativadas`);
        sendLog(11, `Linhas ativadas.`)
    }
}

function Freecam(btnId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Freecam', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `Freecam ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `Freecam ${toggle ? 'ativado' : 'desativado'}.`)
}

async function ChangeSkin(playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let id = playerId ? playerId : myId
    const skinName = await showPopup('input',`Coloque o nome da Skin`,"mp_m_freemode_01 | mp_f_freemode_01");
    if (skinName) {
        $.post('http://arc.Panel/ChangeSkin', JSON.stringify({skinName, id}));
        sendLog(11, `Skin alterada para ${skinName}.`)
    }
}

function Revive(playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let id = playerId ? playerId : myId
    $.post('http://arc.Panel/Revive', JSON.stringify({id}));
    sendLog(11, `Reviveu o id ${id}.`)
}

function Armour(playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let id = playerId ? playerId : myId
    $.post('http://arc.Panel/Armour', JSON.stringify({id}));
    sendLog(11, `Deu colete para o id ${id}.`)
}

function Kill(playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let id = playerId ? playerId : myId
    $.post('http://arc.Panel/Kill', JSON.stringify({id}));
    sendLog(11, `Matou o id ${id}.`)
}

function TpWay() {
    if (!checkPermissions(myId, "teleport_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/TpWay', JSON.stringify({}));
    sendLog(11, `Deu TpWay.`)
}

async function TpCds() {
    if (!checkPermissions(myId, "teleport_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const cds = await showPopup('input', 'Coloque a coordenada para se teletransportar.', 'Exemplo: 0, 0, 0');
    if (cds) {
        $.post('http://arc.Panel/TpCds', JSON.stringify({cds}));
        sendLog(11, `Deu TpCds para: ${cds}.`)
    }
}

function TpToMe(playerId) {
    if (!checkPermissions(myId, "teleport_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/TpToMe', JSON.stringify({playerId}));
    sendLog(11, `Puxou o jogador ${playerId}.`)
}

function TpTo(playerId) {
    if (!checkPermissions(myId, "teleport_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/TpTo', JSON.stringify({playerId}));
    sendLog(11, `Deu Tp para o jogador ${playerId}.`)
}

function TazePlayer(playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/TazePlayer', JSON.stringify({playerId}));
    sendLog(11, `Deu taser no jogador ${playerId}.`)
}

function RemoveWeapons(playerId) {
    if (!checkPermissions(myId, "weapons_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/RemoveWeapons', JSON.stringify({playerId}));
    sendLog(14, `Removeu as armas do jogador ${playerId}.`)
}

function CopyVec(type) {
    if (!checkPermissions(myId, "dev_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/CopyVec', JSON.stringify({type}));
    sendLog(11, `Copiou as coordenadas do tipo: ${type}.`)
}

function Debug(btnId, type) {
    if (!checkPermissions(myId, "dev_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Debug', JSON.stringify({toggle, type}));
    sendLog(11, `Ativou o Debug do tipo: ${type}.`)
}

async function Delete(type) {
    if (!checkPermissions(myId, "dev_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const distance = await showPopup('input', 'Coloque a área para deletar.', 'Máximo: 500');
    if (distance) {
        $.post('http://arc.Panel/Delete', JSON.stringify({distance, type}));
        sendLog(11, `Deletou "${type}" em um raio de ${distance} m.`)
    }
}

function SuperJump(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/SuperJump', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `SuperJump ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `SuperJump ${toggle ? 'ativado' : 'desativado'}.`)
}

function SuperRun(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/SuperRun', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `SuperRun ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `SuperRun ${toggle ? 'ativado' : 'desativado'}.`)
}

function SuperSwim(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/SuperSwim', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `SuperSwim ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `SuperSwim ${toggle ? 'ativado' : 'desativado'}.`)
}

function SuperStamina(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/SuperStamina', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `SuperStamina ${toggle ? 'ativada.' : 'desativada'}`);
    sendLog(11, `SuperStamina ${toggle ? 'ativado' : 'desativado'}.`)
}

function DisplayRadar(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/DisplayRadar', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `DisplayRadar ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `DisplayRadar ${toggle ? 'ativado' : 'desativado'}.`)
}

function Invisible(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Invisible', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `Invisible ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `Invisibilidade ${toggle ? 'ativada' : 'desativada'}.`)
}

function Invincible(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Invincible', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `Invincible ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `Invencibilidade ${toggle ? 'ativada' : 'desativada'}.`)
}

function Aimbot(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Aimbot', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `Aimbot ${toggle ? 'ativado. (Segure shift ao mirar)' : 'desativado'}`);
    sendLog(11, `Aimbot ${toggle ? 'ativado' : 'desativado'}.`)
}

function InfAmmo(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/InfAmmo', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `Infinity Ammo ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `Infinity Ammo ${toggle ? 'ativado' : 'desativado'}.`)
}

function HitKill(btnId) {
    if (!checkPermissions(myId, "hack_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/HitKill', JSON.stringify({toggle}));
    showNotification(toggle ? 'success' : 'error', `HitKill ${toggle ? 'ativado.' : 'desativado'}`);
    sendLog(11, `Infinity HitKill ${toggle ? 'ativado' : 'desativado'}.`)
}

async function Geral(type) {
    if (type === 'announce') {
        if (!checkPermissions(myId, "announce_permission")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        const message = await showPopup('input', 'Coloque a mensagem a ser enviada.', '');
        if (message) {
            $.post('http://arc.Panel/Geral', JSON.stringify({type, message}));
            sendLog(11, `Anúncio enviado para todos os jogadores com a mensagem: "${message}".`)
        }
    } else {
        if (type === 'kick') {
            if (!checkPermissions(myId, "kick_player")) {
                showNotification('error', "Sem permissão.");
                return;
            }
        } else {
            if (!checkPermissions(myId, "basic_permissions")) {
                showNotification('error', "Sem permissão.");
                return;
            }
        }
        const confirm = await showPopup('message', `Deseja dar ${type} em geral?`, '');
        if (confirm) {
            $.post('http://arc.Panel/Geral', JSON.stringify({type}));
            sendLog(2, `Deu "${type}" em Geral.`)
        }
    }
}

async function Spawn(type, playerId) {
    spawnId = playerId ? playerId : myId
    if (type === 'money') {
        if (!checkPermissions(myId, "give_money")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        const quantity = await showPopup('input', 'Coloque a quantidade a ser spawnada.', '');
        if (quantity) {
            $.post('http://arc.Panel/Spawn', JSON.stringify({type, quantity, spawnId}));
            sendLog(5, `Spawnou $${quantity} de dinheiro para o jogador ${spawnId}.`)
        }
    } else if (type === 'vehicle') {
        if (!checkPermissions(myId, "vehicle_permissions")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        document.getElementById('sidebar_vehicles').click()
        setTimeout(() => {
            spawnId = playerId ? playerId : myId
        }, 300);
    } else if (type === 'weapon') {
        if (!checkPermissions(myId, "weapons_permissions")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        document.getElementById('sidebar_weapons').click()
        setTimeout(() => {
            spawnId = playerId ? playerId : myId
        }, 300);
    } else if (type === 'item') {
        if (!checkPermissions(myId, "item_permissions")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        document.getElementById('sidebar_inventory').click()
        setTimeout(() => {
            spawnId = playerId ? playerId : myId
        }, 300);
    }
}

async function RemoveMoney(playerId) {
    if (!checkPermissions(myId, "remove_money")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const quantity = await showPopup('input', 'Coloque a quantidade a ser removida.', '');
    if (quantity) {
        $.post('http://arc.Panel/RemoveMoney', JSON.stringify({quantity, playerId}));
        sendLog(5, `Removeu $${quantity} de dinheiro do jogador ${playerId}.`)
    }
}

async function RemoveItem(index, playerId) {
    if (!checkPermissions(myId, "item_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const quantity = await showPopup('input', 'Coloque a quantidade a ser removida.', 'Item: ' + index);
    if (quantity) {
        $.post('http://arc.Panel/RemoveItem', JSON.stringify({index, quantity, playerId}));
        sendLog(6, `Removeu ${quantity}x ${index} do jogador ${playerId}.`)
    }
}

async function RemoveVehicle(index, playerId) {
    if (!checkPermissions(myId, "manage_vehicle")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const confirm = await showPopup('message', 'Tem certeza que deseja remover o veículo?', 'Veículo: ' + index);
    if (confirm) {
        $.post('http://arc.Panel/RemoveVehicle', JSON.stringify({index, playerId}));
        sendLog(7, `Removeu o veículo ${index} do jogador ${playerId}.`)
    }
}

async function AddVehicle(playerId) {
    if (!checkPermissions(myId, "manage_vehicle")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const index = await showPopup('input', 'Coloque o index do veículo que deseja adicionar', 'Exemplo: buffalo4');
    if (index) {
        $.post('http://arc.Panel/AddVehicle', JSON.stringify({index, playerId}));
        sendLog(7, `Adicionou o veículo ${index} ao jogador ${playerId}.`)
    }
}

async function spawnEntity(type, index) {
    if (type === 'vehicle') {
        if (!checkPermissions(myId, "vehicle_permissions")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        $.post('http://arc.Panel/Spawn', JSON.stringify({type, index, spawnId}));
        sendLog(11, `Spawnou o carro de modelo ${index} para o jogador ${spawnId}.`)
    } else if (type === 'weapon') {
        if (!checkPermissions(myId, "weapons_permissions")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        $.post('http://arc.Panel/Spawn', JSON.stringify({type, index, spawnId}));
        sendLog(14, `Spawnou a arma de modelo ${index} para o jogador ${spawnId}.`)
    } else if (type === 'item') {
        if (!checkPermissions(myId, "item_permissions")) {
            showNotification('error', "Sem permissão.");
            return;
        }
        const quantity = await showPopup('input', 'Coloque a quantidade a ser spawnada.', '');
        if (quantity) {
            $.post('http://arc.Panel/Spawn', JSON.stringify({type, index, quantity, spawnId}));
            sendLog(6, `Spawnou ${quantity}x ${index} para o jogador ${spawnId}.`)
        }
    }
}

function maxVeh(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    $.post('http://arc.Panel/maxVeh', JSON.stringify({id}));
    sendLog(11, `Maximizou o veículo do jogador ${id}.`)
}

function maxVehSpeed(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    $.post('http://arc.Panel/maxVehSpeed', JSON.stringify({id}));
    sendLog(11, `Maximizou a velocidade do veículo do jogador ${id}.`)
}

function fixVeh(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    $.post('http://arc.Panel/fixVeh', JSON.stringify({id}));
    sendLog(11, `Consertou o veículo do jogador ${id}.`)
}

function breakVeh(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    $.post('http://arc.Panel/breakVeh', JSON.stringify({id}));
    sendLog(11, `Quebrou o veículo do jogador ${id}.`)
}

function deleteVeh(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    $.post('http://arc.Panel/deleteVeh', JSON.stringify({id}));
    sendLog(11, `Deletou o veículo do jogador ${id}.`)
}

async function changeVehColor(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    const rgb = await showPopup('input', 'Coloque o rgb que deseja.', 'Exemplo: 255, 0, 0');
    if (rgb) {
        $.post('http://arc.Panel/changeVehColor', JSON.stringify({id, rgb}));
        sendLog(11, `Alterou a cor do veículo do jogador ${id} para: ${rgb}.`)
    }
}

function cleanVeh(playerId) {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    id = playerId ? playerId : myId
    $.post('http://arc.Panel/cleanVeh', JSON.stringify({id}));
    sendLog(11, `Limpou o veículo do jogador ${id}.`)
}

function joinVeh() {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/joinVeh', JSON.stringify({}));
    sendLog(11, `Entrou o veículo mais próximo.`)
}

function lockVeh() {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/lockVeh', JSON.stringify({}));
    sendLog(11, `Trancou o veículo mais próximo.`)
}

function unlockVeh() {
    if (!checkPermissions(myId, "vehicle_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/unlockVeh', JSON.stringify({}));
    sendLog(11, `Destrancou o veículo mais próximo.`)
}

function setWeather(type) {
    if (!checkPermissions(myId, "time_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/setWeather', JSON.stringify({type}));
    sendLog(11, `Mudou o clima para: ${type}.`)
}

function setHour(type) {
    if (!checkPermissions(myId, "time_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/setHour', JSON.stringify({type}));
    sendLog(11, `Mudou a hora para o tipo: ${type}.`)
}

async function RemoveWhitelist(playerId) {
    if (!checkPermissions(myId, "unwl_permission")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    if (Number(playerId) === Number(myId)) {
        showNotification('error', "Impossível de remover o seu id.");
        return;
    }
    const confirm = await showPopup('message', 'Deseja remover a whitelist do id '+ playerId +'?') 
    if (confirm) {
        $.post('http://arc.Panel/RemoveWhitelist', JSON.stringify({playerId}));
        sendLog(2, `Removeu a WL do jogador ${playerId}.`)
    }
}

function ScreenShot(playerId) {
    if (!checkPermissions(myId, "basic_permission")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/ScreenShot', JSON.stringify({playerId}));
    sendLog(11, `Tirou ScreenShot do jogador ${playerId}.`)
}

function Freeze(btnId, playerId) {
    if (!checkPermissions(myId, "freeze_player")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Freeze', JSON.stringify({toggle, playerId}));
    sendLog(2, `${toggle ? "Congelou" : "Descongelou"} o jogador ${playerId}.`)
}

function Spectate(btnId, playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    let toggle = btnActive[btnId] || false;
    $.post('http://arc.Panel/Spectate', JSON.stringify({toggle, playerId}));
    sendLog(11, `${toggle ? "Começou a" : "Parou de"} Spectar o jogador ${playerId}.`)
}

async function SendNotify(playerId) {
    if (!checkPermissions(myId, "basic_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const content = await showPopup('input', 'Coloque a mensagem que deseja enviar.', '');
    if (content) {
        $.post('http://arc.Panel/SendNotify', JSON.stringify({playerId, content}));
        sendLog(11, `Mandou uma mensagem para o jogador ${playerId} dizendo: ${content}.`)
    }
}

async function kick(playerId) {
    if (!checkPermissions(myId, "kick_player")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const confirm = await showPopup('message', `Deseja expulsar o id ${playerId}?`, '');
    if (confirm) {
        const reason = await showPopup('input', `Informe o motivo para a expulsão.`, '');
        if (reason) {
            $.post('http://arc.Panel/Kick', JSON.stringify({playerId, reason}));
            sendLog(2, `Expulsou o jogador ${playerId} com o motivo: ${reason}.`)
        }
    }
}

async function ban(playerId) {
    if (!checkPermissions(myId, "ban_player")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const confirm = await showPopup('message', `Deseja banir o id ${playerId}?`, '');
    if (confirm) {
        const reason = await showPopup('input', `Informe o motivo do banimento.`, '');
        if (reason) {
            const cooldown = await showPopup('input', `Informe o tempo para finalizar o banimento em dias.`, '0 = Banimento permanente.');
            if (cooldown) {
                $.post('http://arc.Panel/Ban', JSON.stringify({playerId, reason, cooldown}));   
                sendLog(2, `Baniu o jogador ${playerId} com o motivo: ${reason}. ${cooldown === 0 ? "Permanentemente" : `Por ${cooldown} dias`}.`)
            }
        }
    }
}

async function unban(playerId) {
    if (!checkPermissions(myId, "unban_player")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const confirm = await showPopup('message', `Deseja desbanir o id ${playerId}?`, '');
    if (confirm) {
        $.post('http://arc.Panel/Unban', JSON.stringify({playerId}));
        sendLog(2, `Desbaniu o jogador ${playerId}.`)
    }
}

async function arrest(playerId) {
    if (!checkPermissions(myId, "arrest_player")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    const confirm = await showPopup('message', `Deseja prender o id ${playerId}?`, '');
    if (confirm) {
        const reason = await showPopup('input', `Informe o motivo da prisão.`, '');
        if (reason) {
            const cooldown = await showPopup('input', `Informe o tempo de prisão.`, '');
            if (cooldown) {
                $.post('http://arc.Panel/Arrest', JSON.stringify({playerId, reason, cooldown}));
                sendLog(2, `Prendeu o jogador ${playerId} com o motivo: ${reason}. Com ${cooldown} de cooldown.`)
            }
        }
    }
}

async function setGroup(group, playerId, type, level) {
    if (!checkPermissions(myId, "groups_permissions")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    if (level) {
        const confirmLevel = await showPopup('input', `Coloque o level para ser atribuido ao jogador ${playerId} no grupo ${group}.`, 'Máximo: '+ level);
        if (confirmLevel) { 
            $.post('http://arc.Panel/setGroup', JSON.stringify({group, playerId, confirmLevel, type}));
        }
    } else {
        $.post('http://arc.Panel/setGroup', JSON.stringify({group, playerId, type}));
    }

    sendLog(8, `${type === 'add' ? 'Adicionou' : 'Removeu'} o grupo ${group} de nível ${level} do jogador ${playerId}.`)
}


function changeResourceState(resName, state) {
    if (!checkPermissions(myId, "resource_manage")) {
        showNotification('error', "Sem permissão.");
        return;
    }
    $.post('http://arc.Panel/changeResourceState', JSON.stringify({resName, state}));
    sendLog(10, `${state === 'start' ? 'Startou' : state === 'stop' ? 'Parou' : 'Restartou'} o resource ${resName}.`)
    currentContainer = ''
    setTimeout(() => {
        document.getElementById('sidebar_resources').click()
    }, 300);
}
/////////////////////////////////

var btnIDS = 0
let buttonContainer = ''
function createCardBtn(color, text, onclick, enableActive, args, permissionRequired) {
    btnIDS = (buttonContainer !== currentContainer) ? 0 : btnIDS + 1;
    buttonContainer = currentContainer;

    if (permissionRequired && !checkPermissions(myId, permissionRequired)) {
        return `<div class="card-item">
                    <button class="card-btn ${color} disabled" onclick="showNotification('error', 'Sem permissão para realizar esta ação'); return false;">
                        ${text}
                    </button>
                </div>`;
    }

    let formattedArgs = '';
    if (typeof args === 'string') {
        const argsArray = args.split(',').map(arg => arg.trim());
        formattedArgs = argsArray.map(arg => `'${arg}'`).join(', ');
    } else {
        formattedArgs = args;
    }

    let argsList = enableActive ? `${btnIDS}` : '';
    if (formattedArgs) {
        argsList += argsList ? `, ${formattedArgs}` : formattedArgs;
    }

    const onclickFunc = onclick ? `onclick=" 
        ${enableActive ? `btnActive[${btnIDS}] ? this.classList.remove('active') : this.classList.add('active'); btnActive[${btnIDS}] = !btnActive[${btnIDS}];` : ''} 
        ${onclick}(${argsList});
        return false;"` : '';

    return `<div class="card-item">
                <button class="card-btn ${color} ${btnActive[btnIDS] ? 'active' : ''}" ${onclickFunc}>
                    ${text}
                </button>
            </div>`;
}

function zoomImage(imgURL) {
    const nav = document.querySelector('nav');
    const zoomContainer = document.getElementById('zoomContainer');
    const zoomedImage = document.getElementById('zoomedImage');

    if (zoomContainer.style.display === 'flex') {
        if (nav && opened) {
            nav.style.display = 'block';
        }
        zoomContainer.style.display = 'none';
        zoomContainer.classList.remove('zoomed');
        zoomedImage.src = '';
    } else {
        if (nav) {
            nav.style.display = 'none';
        }
        zoomContainer.style.display = 'flex';

        zoomContainer.style.width = '100vw';
        zoomContainer.style.height = '100vh';

        zoomedImage.src = imgURL;
        zoomedImage.classList.add('zoomed');

        zoomedImage.style.maxWidth = '100%';
        zoomedImage.style.maxHeight = '100%';
        zoomedImage.style.objectFit = 'contain';
    }
}

function toggleSection(sectionId, scroll, checkActive) {
    const section = document.getElementById(sectionId);
    if (!section) {
        return;
    }
    const button = section.previousElementSibling?.querySelector('.toggle-btn');
    if (!button) {
        return;
    }
    section.classList.add('animate');
    if (checkActive) {
        section.style.display = 'none';
    }
    if (section.style.display === 'none') {
        section.style.display = 'block';
        button.innerText = 'Minimizar';
        if (scroll) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        section.style.display = 'none';
        button.innerText = 'Expandir';
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function openSuspect(suspectId) {
    currentSuspectId = suspectId;
    currentContainer = '';
    document.getElementById('sidebar_suspects').click();
    setTimeout(() => {
        playAudio('click');
        toggleSection('currentSuspect-container', true);
    }, 300);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function concluedReport(reportId) {
    if (!reportId) {
        return
    }
    var confirm = await showPopup('message',`Concluir o report ${reportId}`,"Deseja Concluir a Ação?");
    if (confirm) { 
        showNotification('success', `Report ${reportId} concluído.`, 0, true) 
        $.post('http://arc.Panel/concluedReport', JSON.stringify({
            reportId: reportId,
            concluedBy: parseInt(myId)
        }));
        sendLog(9, `Concluiu o report de id ${reportId}.`);
        setTimeout(() => {
            currentContainer = ''
            playAudio('click');
            document.getElementById('sidebar_reports').click();
        }, 400);
    } else {
        showNotification('error', 'Conclusão cancelada.')
    }
}

async function openReport(reportId) {
    currentReportId = reportId;
    currentContainer = '';
    $.post('http://arc.Panel/updateReports', JSON.stringify({reportId}));
    containerUpdated = false
    await waitForUpdate()

    document.getElementById('sidebar_reports').click();
    setTimeout(() => {
        playAudio('click');
        displayReportMessages(reportId);
        toggleSection('currentReport-container', true);
    }, 300);
}

function displayReportMessages(reportId) {
    currentReportMessages = list.reportsList[reportId].messages
    const messageHistory = document.getElementById('reportMessageHistory');
    if (!messageHistory) {
        return
    }
    messageHistory.innerHTML = '';
    var msgColor = 'rgb(240, 211, 17)'
    var backgroundColor = 'rgba(255, 188, 97, 0.1)'
    Object.values(currentReportMessages).forEach((msg, index) => {
        if (msg.author === myId) {
            msgColor = 'rgb(0, 255, 255)'
            backgroundColor = 'rgba(97, 121, 255, 0.1)'
        }
        const messageElement = `
            <div class="message-card" style="border-left: 5px solid ${msgColor}; padding-left: 10px; background-color: ${backgroundColor}">
                <p class="message-info">
                    <span class="message-author" style="color:${msgColor}" onclick="updatePlayer('${msg.author}')">
                        ${msg.name} [${msg.author}]:
                    </span>
                    <span class="message-text">${msg.message}</span>
                </p>
                <p class="message-date">${msg.date} às ${msg.time}</p>
            </div>
        `;
        messageHistory.innerHTML += messageElement;
    });

    messageHistory.scrollTo({
        top: messageHistory.scrollHeight,
        behavior: 'smooth'
      });

    const messages = document.querySelectorAll('.message-text')
    copyText(messages)
}

function copyText(messages) {
    messages.forEach(element => {
        if (element instanceof HTMLElement) { // Verificando se o elemento é um HTMLElement
            element.addEventListener('click', (event) => {
                const tempInput = document.createElement('textarea');
                tempInput.value = event.target.innerText;
                document.body.appendChild(tempInput);
                tempInput.select();

                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showNotification('success', 'Texto copiado!');
                        sendLog(13, `Copiou o texto "${event.target.innerText}".`);
                    } else {
                        console.error('Falha ao copiar o texto');
                    }
                } catch (err) {
                    console.error('Erro ao copiar o texto: ', err);
                }

                document.body.removeChild(tempInput);
            });
        } else {
            console.error('Elemento não é um HTMLElement:', element);
        }
    });
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let canSendMessage = true;
let countdown = 3;

function sendMessage(type, reportId) {
    const messageInput = document.getElementById('newMessage');
    const messageText = messageInput.value;
    const sendMessageBtn = document.getElementById('messageButton');

    if (!canSendMessage) {
        return;
    }

    if (messageText.length > 200) {
        showNotification('error', 'Sua mensagem ultrapassou os 200 caractéries. Total: '+ messageText.length)
        return
    }

    if (messageText.trim()) {
        const now = new Date();
        const date = now.toLocaleDateString('pt-BR');
        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const messageData = {
            author: myId,
            name: myName,
            message: messageText,
            date: date,
            time: time,
        };

        if (type === 1) {
            $.post('http://arc.Panel/sendMessage', JSON.stringify({
                messageData: messageData
            }));
            sendLog(12, `Enviou a mensagem: "${messageText}" no chat admin.`)
            displayMessages();
        } else if (type === 2) {
            $.post('http://arc.Panel/sendReportMessage', JSON.stringify({
                messageData: messageData,
                reportId: reportId
            }));
            sendLog(12, `Enviou a mensagem: "${messageText}" no report de id ${reportId}.`)
            playAudio('message')
        }

        messageInput.value = '';

        canSendMessage = false;
        startCountdown(sendMessageBtn);
    }
}

function startCountdown(button) {
    let timeLeft = countdown;
    button.disabled = true;
    button.innerText = `Aguarde ${timeLeft}s`;
    button.classList.remove('green')
    button.classList.add('red')
    const interval = setInterval(() => {
        timeLeft--;
        button.innerText = `Aguarde ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            canSendMessage = true;
            button.disabled = false;
            button.classList.remove('red')
            button.classList.add('green')
            button.innerText = 'Enviar Mensagem'; 
        }
    }, 1000);
}

function displayMessages() {
    const messageHistory = document.getElementById('messageHistory');
    if (!messageHistory) {
        return
    }
    messageHistory.innerHTML = '';
    var msgColor = 'rgb(97, 121, 255)'
    const backgroundColor = 'rgba(97, 121, 255, 0.1)'
    Object.values(messages).forEach((msg, index) => {
        if (msg.author === myId) {
            msgColor = 'rgb(0, 255, 255)'
        }
        const messageElement = `
            <div class="message-card" style="border-left: 5px solid ${msgColor}; padding-left: 10px; background-color: ${backgroundColor}">
                <p class="message-info">
                    <span class="message-author" style="color:${msgColor}" onclick="updatePlayer('${msg.author}')">
                        ${msg.name} [${msg.author}]:
                    </span>
                    <span class="message-text">${msg.message}</span>
                </p>
                <p class="message-date">${msg.date} às ${msg.time}</p>
            </div>
        `;
        messageHistory.innerHTML += messageElement;
    });

    messageHistory.scrollTo({
        top: messageHistory.scrollHeight,
        behavior: 'smooth'
      });

    const copyMessages = document.querySelectorAll('.message-text')
    copyText(copyMessages)
}

function updateMessageNotification() {
    const messageNotificationBadge = document.getElementById('message-notification');
    if (!messageNotificationBadge) {
        return
    }
    let currentCount = parseInt(messageNotificationBadge.innerText);
    playAudio('message')
    messageNotificationBadge.innerText = currentCount + 1;
    messageNotificationBadge.style.display = 'flex';
}

function resetMessageNotification() {
    const messageNotificationBadge = document.getElementById('message-notification');
    messageNotificationBadge.innerText = '0';
    messageNotificationBadge.style.display = 'none';
}

function loadGraphs() {
    createGraph('JoinLeft-graph', 24, 'JoinLeft');
    createGraph('Punishments-graph', 24, 'Punishments');
    createGraph('Reports-graph', 24, 'Reports');
    createGraph('Suspects-graph', 24, 'Suspects');
    createGraph('Registers-graph', 24, 'Registers');
}

async function updateGraphData(graphType, timeRange) {
    if (timeRange === 7) {
        containerUpdated = false
        $.post('http://arc.Panel/loadGraph', JSON.stringify({graphType}));
        await waitForUpdate()
    }
    switch (graphType) {
        case 'JoinLeft':
            if (timeRange === 24) {
                createGraph('JoinLeft-graph', 24, 'JoinLeft');
            } else {
                createGraph('JoinLeft-graph', 7, 'JoinLeft');
            }
            break;

        case 'Punishments':
            if (timeRange === 24) {
                createGraph('Punishments-graph', 24, 'Punishments');
            } else {
                createGraph('Punishments-graph', 7, 'Punishments');
            }
            break;

        case 'Reports':
            if (timeRange === 24) {
                createGraph('Reports-graph', 24, 'Reports');
            } else {
                createGraph('Reports-graph', 7, 'Reports');
            }
            break;

        case 'Suspects':
            if (timeRange === 24) {
                createGraph('Suspects-graph', 24, 'Suspects');
            } else {
                createGraph('Suspects-graph', 7, 'Suspects');
            }
            break;

        case 'Registers':
            if (timeRange === 24) {
                createGraph('Registers-graph', 24, 'Registers');
            } else {
                createGraph('Registers-graph', 7, 'Registers');
            }
            break;
        default:
            console.error('Tipo de gráfico desconhecido:', graphType);
            break;
    }
}

function groupByLast24Hours(list) {
    if (!Array.isArray(list)) {
        return []; 
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const twentyFourHoursAgo = currentTime - (24 * 60 * 60);

    return list.filter(timestamp => timestamp >= twentyFourHoursAgo);
}

function groupByLast7Days(list) {
    if (!Array.isArray(list)) {
        return [];
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = currentTime - (7 * 24 * 60 * 60);

    return list.filter(timestamp => timestamp >= sevenDaysAgo);
}

function createGraph(containerId, timeRange, type) {
    const container = document.getElementById(containerId);
    
    let labels = [], data1 = [], data2 = [], data3 = [], data4 = [];
    
    // Mapeamento de cores para labels específicos
    const labelColors = {
        'Entrada de Admins': 'rgba(54, 162, 235, 1)', // Azul
        'Entrada de Players': 'rgba(51, 255, 153, 1)', // Verde
        'Saída de Admins': 'rgba(255, 159, 64, 1)', // Laranja
        'Saída de Players': 'rgba(255, 99, 132, 1)', // Vermelho
        'Banimentos': 'rgba(255, 205, 86, 1)', // Amarelo
        'Desbanimentos': 'rgba(153, 102, 255, 1)', // Roxo
        'Reports Abertos': 'rgba(75, 192, 192, 1)', // Ciano
        'Reports Concluídos': 'rgba(153, 51, 255, 1)', // Roxo escuro
        'Suspeitos': 'rgba(255, 159, 64, 1)', // Laranja
        'Registros': 'rgba(75, 192, 192, 1)' // Ciano
    };
    
    const typeMapping = {
        'JoinLeft': { label1: 'Entrada de Admins', label2: 'Entrada de Players', label3: 'Saída de Admins', label4: 'Saída de Players', keys: ['admin_joined', 'player_joined', 'admin_left', 'player_left'] },
        'Punishments': { label1: 'Banimentos', label2: 'Desbanimentos', label3: null, label4: null, keys: ['ban', 'unban'] },
        'Reports': { label1: 'Reports Abertos', label2: 'Reports Concluídos', label3: null, label4: null, keys: ['report_opened', 'report_concluded'] },
        'Suspects': { label1: 'Suspeitos', label2: null, label3: null, label4: null, keys: ['suspect'] },
        'Registers': { label1: 'Registros', label2: null, label3: null, label4: null, keys: ['register'] },
    };

    const { label1, label2, label3, label4, keys } = typeMapping[type];
    
    const groupData = (key) => {
        return timeRange === 24 ? groupByLast24Hours(list.graphList[key]) : groupByLast7Days(list.graphList[key]);
    };

    let groupedData = keys.map(key => groupData(key));
    
    if (timeRange === 24) {
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        data1 = new Array(24).fill(0);
        data2 = new Array(24).fill(0);
        data3 = new Array(24).fill(0);
        data4 = new Array(24).fill(0);
    } else {
        // Mapear os números dos dias da semana para os nomes
        const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        labels = daysOfWeek;
        data1 = new Array(7).fill(0);
        data2 = new Array(7).fill(0);
        data3 = new Array(7).fill(0);
        data4 = new Array(7).fill(0);
    }

    groupedData[0].forEach(timestamp => {
        const index = timeRange === 24 ? new Date(timestamp * 1000).getHours() : new Date(timestamp * 1000).getDay();
        data1[index]++; // Atualiza o contador para o label1
    });

    if (label2) {
        groupedData[1].forEach(timestamp => {
            const index = timeRange === 24 ? new Date(timestamp * 1000).getHours() : new Date(timestamp * 1000).getDay();
            data2[index]++; // Atualiza o contador para o label2
        });
    }

    if (label3) {
        groupedData[2]?.forEach(timestamp => {
            const index = timeRange === 24 ? new Date(timestamp * 1000).getHours() : new Date(timestamp * 1000).getDay();
            data3[index]++; // Atualiza o contador para o label3
        });
    }

    if (label4) {
        groupedData[3]?.forEach(timestamp => {
            const index = timeRange === 24 ? new Date(timestamp * 1000).getHours() : new Date(timestamp * 1000).getDay();
            data4[index]++; // Atualiza o contador para o label4
        });
    }

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: label1,
                    data: data1,
                    fill: false,
                    borderColor: labelColors[label1], // Cor dinâmica para label1
                    tension: 0.1,
                    borderWidth: 2
                },
                ...(label2 ? [{
                    label: label2,
                    data: data2,
                    fill: false,
                    borderColor: labelColors[label2], // Cor dinâmica para label2
                    tension: 0.1,
                    borderWidth: 2
                }] : []),
                ...(label3 ? [{
                    label: label3,
                    data: data3,
                    fill: false,
                    borderColor: labelColors[label3], // Cor dinâmica para label3
                    tension: 0.1,
                    borderWidth: 2
                }] : []),
                ...(label4 ? [{
                    label: label4,
                    data: data4,
                    fill: false,
                    borderColor: labelColors[label4], // Cor dinâmica para label4
                    tension: 0.1,
                    borderWidth: 2
                }] : []),
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: timeRange === 24 ? 'Hora' : 'Dia da Semana'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        }
    };

    new Chart(canvas, config);
}