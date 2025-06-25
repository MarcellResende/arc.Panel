local arclib = _import('lib')
local scriptLicense, scriptVersion = arclib.returnScriptInfos(GetCurrentResourceName())
local pass1 = '/Arc'
local pass2 = '7322'

function arc.____res____started____(pass)
    return arclib.ResourceStarted(GetCurrentResourceName(), pass)
end

local printed = false
function arc.checkLib()
    if printed then
        return
    end
    if GetResourceState('arc.lib') ~= 'started' then
        arclib = nil
        print('É essencial arc.lib estar startado para iniciar o script.')
        printed = true
        SetTimeout(5000, function ()
            printed = false
        end)
        return
    end

    if not arclib then
        print('Falha ao carregar as funções em arc.lib.')
        printed = true
        SetTimeout(5000, function ()
            printed = false
        end)
        return
    end

    if not arc.____res____started____(''..pass1..''..pass2..''..GetCurrentResourceName()..'_'..scriptLicense..'_'..scriptVersion..'') == ''..pass1..''..pass2..''..GetCurrentResourceName()..'_'..scriptLicense..'_'..scriptVersion..'' or not arclib.returnLicenses() then
        print('Falha ao carregar autenticação.')
        printed = true
        SetTimeout(5000, function ()
            printed = false
        end)
        return
    end
    SetTimeout(5000, arc.checkLib)
    return true
end

while not arc.checkLib() or not arc.____res____started____(''..pass1..''..pass2..''..GetCurrentResourceName()..'_'..scriptLicense..'_'..scriptVersion..'') == ''..pass1..''..pass2..''..GetCurrentResourceName()..'_'..scriptLicense..'_'..scriptVersion..'' or not arclib.returnLicenses() do
    Wait(10)
end

function arc.initialized()
    return scriptLicense, scriptVersion
end

----------------------------------------------------------------------------------------------------------------------------------------

AddEventHandler('playerDropped', function(reason)
    arc.playerLeft(source)
end)

----------------------------------------------------------------------------------------------------------------------------------------

function arc.returnFullGraph(category)
    local categories = {
        ['JoinLeft'] = {'admin_joined', 'admin_left', 'player_joined', 'player_left'},
        ['Punishments'] = {'ban', 'unban'},
        ['Reports'] = {'report_opened', 'report_concluded'},
        ['Suspects'] = {'suspect'},
        ['Registers'] = {'register'}
    }

    cleanOldGraphEntries()

    local types = categories[category]
    if not types then
        return {}
    end

    local placeholders = {}
    for _ in ipairs(types) do
        table.insert(placeholders, "?")
    end
    local query = string.format(
        "SELECT type, timestamp FROM arc_graphs WHERE type IN (%s)",
        table.concat(placeholders, ", ")
    )

    local results = arc.executeSync(query, types)

    local graphs = {}
    for _, row in ipairs(results) do
        if not graphs[row.type] then
            graphs[row.type] = {}
        end
        table.insert(graphs[row.type], row.timestamp)
    end

    return graphs
end


function arc.returnGraphs()
    local recentGraphs = {}
    local oneDayAgo = os.time() - (24 * 60 * 60)
    local query = [[
        SELECT type, timestamp 
        FROM arc_graphs
        WHERE timestamp >= ?
    ]]
    local results = arc.executeSync(query, {oneDayAgo})

    for _, row in ipairs(results) do
        if not recentGraphs[row.type] then
            recentGraphs[row.type] = {}
        end
        table.insert(recentGraphs[row.type], row.timestamp)
    end

    return recentGraphs
end

function cleanOldGraphEntries()
    local oneWeekAgo = os.time() - (7 * 24 * 60 * 60)
    local query = [[
        DELETE FROM arc_graphs
        WHERE timestamp < ?
    ]]
    arc.executeSync(query, {oneWeekAgo})
end


--[[
    'admin_joined',
    'admin_left',
    'player_joined',
    'player_left',
    'ban',
    'unban',
    'report_opened',
    'report_concluded',
    'register',
    'suspect'
]]

function updateGraph(type)
    local query = [[
        INSERT INTO arc_graphs (type, timestamp)
        VALUES (?, ?)
    ]]
    local params = {type, os.time()}
    arc.executeSync(query, params)
end

function arc.updateGraph(type, quantity)
    while quantity > 0 do
        updateGraph(type)
        quantity = quantity - 1
    end
end

function arc.getDate()
    return os.date("%d/%m/%Y | %H:%M:%S", os.time())
end
----------------------------------------------------------------------------------------------------------------------------------------

function arc.ExtractIdentifiers(source)
    local identifiers = {
        steam = nil,
        discord = nil,
        license = nil,
        license2 = nil,
        xbl = nil,
        live = nil,
        ip = nil,
        tokens = {},
        fivem = nil
    }

    local playerIdents = GetPlayerIdentifiers(source)

    local numTokens = GetNumPlayerTokens(source)
    if numTokens > 0 then
        for i = 1, numTokens do
            table.insert(identifiers.tokens, GetPlayerToken(source, i))
        end
    end

    for i = 1, #playerIdents do
        local ident = playerIdents[i]
        local colonPosition = string.find(ident, ":")
        local identifierType = string.sub(ident, 1, colonPosition - 1)
        local identifierValue = string.sub(ident, colonPosition + 1)
        identifiers[identifierType] = identifierValue
    end

    return identifiers
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.screenshot(webhook, title, description, s)
    s = s or source
    arc.DetailedLog(webhook, title, description, 'red', s)
    
    if Config.Panel.EnableScreenshot then
        exports["discord-screenshot"]:requestCustomClientScreenshotUploadToDiscord(s, webhook, {
                encoding = "png",
                quality = 1
            },
            {
                username = "Arc Panel",
                avatar_url = 'https://images-ext-1.discordapp.net/external/iWhEBkrqrMJoGuchcsHljwbKvN1jZlN3IIyvclBtYhk/https/cdn.discordapp.com/avatars/1280625167717892229/2e89ccc86a827935476d404154639109.webp',
                embeds = {
                    {
                        color = 171512,
                        author = {
                            name = "✅ ScreenShot enviada!\n\n❗ A screenshot poderá ou não ter erro de renderização devido ao FiveM."
                        }
                    }
                }
            },
            30000,
            function(error)
                if error then
                    return print("^1SCREENSHOT ERROR: " .. error)
                end
                print("Sent screenshot successfully")
            end
        )
    end
end

local function createLogEmbed(title, description, fields, color, s)
    local imageurl = 'https://images-ext-1.discordapp.net/external/iWhEBkrqrMJoGuchcsHljwbKvN1jZlN3IIyvclBtYhk/https/cdn.discordapp.com/avatars/1280625167717892229/2e89ccc86a827935476d404154639109.webp'
    return {
        username = 'Arc Panel',
        avatar_url = imageurl,
        embeds = {
            {
                title = "**" .. title .. "**",
                description = description,
                fields = fields or {},
                thumbnail = { url = imageurl },
                footer = {
                    text = "Arc Panel - " .. os.date("%d/%m/%Y | %H:%M:%S"),
                    icon_url = imageurl
                },
                color = color,
            }
        }
    }
end

local function sendLog(webhook, embed)
    PerformHttpRequest(webhook, function(err, text, headers) end, 'POST', json.encode(embed), { ['Content-Type'] = 'application/json' })
end

local colors = {
    red = 16711680,
    green = 65280,
    yellow = 16776960,
    orange = 16753920,
    blue = 255,
    white = 16777215,
}

local function getColor(color)
    return colors[color] or 65486
end

function arc.SimpleLog(webhook, title, description, color, s)
    s = s or source
    local Color = getColor(color)
    local user_id = arc.returnPlayerId(s)

    if user_id then
        local Username = arc.returnPlayerFullName(user_id)
        local desc = "**Jogador:**\n``[" .. user_id .. "] " ..Username.. "``\n\n" .. description
        local embed = createLogEmbed(title, desc, nil, Color)
        sendLog(webhook, embed)
    end
end

function arc.DetailedLog(webhook, title, description, color, s)
    s = s or source
    local Color = getColor(color)
    local user_id = arc.returnPlayerId(s)

    if user_id then
        local Username = arc.returnPlayerFullName(user_id)
        local cds = arc.returnPlayerPos(arc.returnPlayerId(s))
        local coords = ''
        if cds then
            coords = string.format("%.2f, %.2f, %.2f", cds.x, cds.y, cds.z)
        end

        local infos = arc.ExtractIdentifiers(s)

        local steam = infos.steam or "Não disponível"
        local ip = infos.ip or "Não disponível"
        local xbl = infos.xbl or "Não disponível"
        local live = infos.live or "Não disponível"
        local discord = infos.discord or "Não disponível"
        local license = infos.license or "Não disponível"
        local license2 = infos.license2 or "Não disponível"
        local fivem = infos.fivem or "Não disponível"
        local tokens = infos.tokens or {}

        local desc = "**Jogador:**\n``[" .. user_id .. "] "..Username.."``\n\n**Características:**\n```fix\n" .. description .. "\n\nCoordenadas:\n" .. coords .. "```\n\n\n"
        local fields = {
            { name = "**Steam Id:**", value = '``'..steam..'``' },
            { name = "**Ip:**", value = '||``'..ip..'``||' },
            { name = "**Xbl:**", value = '``'..xbl..'``' },
            { name = "**Live:**", value = '``'..live..'``' },
            { name = "**Discord:**", value = '<@'..discord..'>' },
            { name = "**License:**", value = '``' .. license .. '``' },
            { name = "**License2:**", value = '``' .. license2 .. '``' },
            { name = "**Fivem:**", value = '``' .. fivem .. '``' },
            { name = "**Tokens:**", value = '``' .. json.encode(tokens) .. '``' },
            { name = "**SteamURL:**", value = (steam ~= "Não disponível") and 'https://steamcommunity.com/profiles/'..tostring(tonumber(steam, 16)) or "``Não disponível``" },
        }
        local embed = createLogEmbed(title, desc, fields, Color)
        sendLog(webhook, embed)
    end
end

----------------------------------------------------------------------------------------------------------------------------------------

local onlinePlayers = {}
local onlineAdmins = {}
local onlinePlayersQuantity = 0
local onlineAdminsQuantity = 0

function arc.hasAdminPermission(id, perm)
    local query = [[
        SELECT permissions 
        FROM arc_staff 
        WHERE id = ?
    ]]
    local result = arc.executeSync(query, {id})

    if #result > 0 then
        local permissions = json.decode(result[1].permissions)
        for _, v in pairs(permissions) do
            if v == perm then
                return true
            end
        end
    end

    return false
end

function arc.isStaff(id)
    local query = [[
        SELECT 1 
        FROM arc_staff 
        WHERE id = ?
    ]]
    local result = arc.executeSync(query, {id})

    return #result > 0
end

function arc.addStaff(id, type, permissions)
    local queryCheck = [[
        SELECT 1 
        FROM arc_staff 
        WHERE id = ?
    ]]
    local exists = arc.executeSync(queryCheck, {id})

    if #exists > 0 then
        return false
    end

    local queryInsert = [[
        INSERT INTO arc_staff (id, type, permissions)
        VALUES (?, ?, ?)
    ]]
    arc.executeSync(queryInsert, {id, type, json.encode(permissions)})
    if arc.getPlayerSource(id) then
        onlinePlayersQuantity = onlinePlayersQuantity - 1
        onlineAdminsQuantity = onlineAdminsQuantity + 1
        onlineAdmins[tostring(arc.getPlayerSource(id))] = id
    end
    return true
end

function arc.remStaff(id)
    local queryCheck = [[
        SELECT 1
        FROM arc_staff 
        WHERE id = ?
    ]]
    local exists = arc.executeSync(queryCheck, {id})

    if #exists == 0 then
        return false
    end

    local queryDelete = [[
        DELETE FROM arc_staff 
        WHERE id = ?
    ]]
    arc.executeSync(queryDelete, {id})
    if arc.getPlayerSource(id) then
        onlinePlayersQuantity = onlinePlayersQuantity + 1
        onlineAdminsQuantity = onlineAdminsQuantity - 1
        onlineAdmins[tostring(arc.getPlayerSource(id))] = nil
    end
    return true
end

function arc.returnAdminPermissions(id)
    local query = [[
        SELECT permissions 
        FROM arc_staff 
        WHERE id = ?
    ]]
    local result = arc.executeSync(query, {id})

    if #result > 0 then
        return json.decode(result[1].permissions)
    end

    return {}
end

function arc.returnAdminType(id)
    local query = [[
        SELECT type 
        FROM arc_staff 
        WHERE id = ?
    ]]
    local result = arc.executeSync(query, {id})

    if #result > 0 then
        return result[1].type
    end

    return "Desconhecido"
end

function arc.returnStaffs()
    local query = [[
        SELECT id, type, permissions 
        FROM arc_staff
    ]]
    local result = arc.executeSync(query)

    local admins = {}
    for _, row in ipairs(result) do
        admins[row.id] = {
            type = row.type,
            permissions = json.decode(row.permissions)
        }
    end

    return admins
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.playerJoined(s)
    s = s or source
    local playerId = arc.returnPlayerId(s)
    local banInfo, banId = arc.isPlayerBanned(playerId)

    if banInfo then
        local isPermanent = not banInfo.expiration
        local currentTime = os.time()

        local timestampInSeconds = tonumber(banInfo.expiration) / 1000
        local formattedDate = os.date("%d/%m/%Y | %H:%M:%S", timestampInSeconds)

        if not isPermanent and currentTime >= timestampInSeconds then
            arc.unbanPlayer(playerId)
        else
            local banExpirationText = ''
            if isPermanent then
                banExpirationText = "Banimento Permanente"
            else
                banExpirationText = "Data de Expiração: "..formattedDate
            end
            DropPlayer(s, "Você está banido!\n\nId do Banimento: "..banId.."\nMotivo: "..banInfo.reason.."\nBanido por: "..banInfo.author.."\n"..banExpirationText)
        end
    end

    if playerId then
        if arc.isStaff(playerId) then
            onlineAdmins[tostring(s)] = playerId
            onlineAdminsQuantity = onlineAdminsQuantity + 1
            updateGraph('admin_joined')
        else
            onlinePlayersQuantity = onlinePlayersQuantity + 1
            updateGraph('player_joined')
        end
        onlinePlayers[tostring(s)] = playerId

        local userInfos = arc.ExtractIdentifiers(s)
        
        local query = [[
            SELECT data FROM arc_players WHERE player_id = ?
        ]]
        local result = arc.executeSync(query, {tostring(playerId)})

        if #result == 0 then
            local insertQuery = [[
                INSERT INTO arc_players (player_id, data) VALUES (?, ?)
            ]]
            arc.executeSync(insertQuery, {tostring(playerId), json.encode(userInfos)})
        else
            local updateQuery = [[
                UPDATE arc_players SET data = ? WHERE player_id = ?
            ]]
            arc.executeSync(updateQuery, {json.encode(userInfos), tostring(playerId)})
        end

        return true
    end
    return false
end

function arc.collectPlayerIdentifiers(id)
    local query = [[
        SELECT data FROM arc_players WHERE player_id = ?
    ]]
    local result = arc.executeSync(query, {tostring(id)})

    if #result > 0 then
        return json.decode(result[1].data)
    end

    return {}
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.playerLeft(s)
    s = s or source
    if onlineAdmins[tostring(s)] then
        updateGraph('admin_left')
        onlineAdminsQuantity = onlineAdminsQuantity - 1
        onlineAdmins[tostring(s)] = nil
    else
        updateGraph('player_left')
        onlinePlayersQuantity = onlinePlayersQuantity - 1
    end
    onlinePlayers[tostring(s)] = nil
end

function arc.getPlayerSource(playerId)
    for source, id in pairs(onlinePlayers) do
        if tostring(id) == tostring(playerId) then
            return parseInt(source)
        end
    end
    return nil
end

local function isPlayerOnline(userId)
    for k,v in pairs(onlinePlayers) do
        if parseInt(userId) == parseInt(v) then
            return true
        end
    end
    return false
end

function arc.returnPanelInfos()
    local pData, playersCollected, playersQtd, adminsQtd = arc.returnCachedPlayers()
    return pData, playersCollected, playersQtd, adminsQtd, arc.returnBans(), arc.returnReports(), arc.returnStaffs()
end

function returnAllPlayerFlags(userId)
    local p_flags = returnPlayerFlags(userId)
    local health = arc.returnPlayerHealth(userId)
    local armour = arc.returnPlayerArmour(userId)
    local cds = arc.returnPlayerPos(userId)
    local phone = arc.returnPlayerPhone(userId)
    local wallet = arc.returnPlayerWallet(userId)
    local bank = arc.returnPlayerBank(userId)
    local inventory = arc.returnPlayerInventory(userId)
    local vehicles = arc.returnPlayerVehicles(userId)
    local roleName = arc.returnPlayerRoleName(userId) or 'Cidadão'

    local infos = {}
    if p_flags.online then
        infos = arc.ExtractIdentifiers(arc.getPlayerSource(userId))
    end

    local flags = {
        online = p_flags.online,
        fullName = p_flags.fullName,
        health = health,
        armour = armour,
        coords = cds,
        phone = phone,
        wallet = wallet,
        bank = bank,
        inventory = inventory,
        vehicles = vehicles,
        roleName = roleName,
        permissions = p_flags.permissions,
        adminRoleName = p_flags.adminRoleName,
        adminPanelRoleName = p_flags.adminPanelRoleName,
        banned = p_flags.banned,
        infos = infos
    }
    return flags
end

local cachedPlayers = {}
local itemsPerPage = 100

function arc.returnCachedPlayers()
    local whitelistedPlayersId = arc.returnWhitelistedPlayersId()
    local playersCollected = 0
    for k,v in pairs(cachedPlayers) do
        playersCollected = k
    end
    if Config.Panel.CollectOfflinePlayers then
        playersCollected = #whitelistedPlayersId
    end
    return cachedPlayers, playersCollected, onlinePlayersQuantity, onlineAdminsQuantity
end

function returnPlayerFlags(userId)
    local online = isPlayerOnline(userId)
    local fullName = arc.returnPlayerFullName(userId)
    local banned = arc.isPlayerBanned(userId)
    local permissions = arc.returnAdminPermissions(userId)
    local adminPanelRoleName = nil
    if #permissions >= 1 then
        adminPanelRoleName = arc.returnAdminType(userId)
    end
    local adminRoleName = arc.returnAdminRoleName(userId)
    local flags = {
        online = online,
        fullName = fullName,
        permissions = permissions,
        adminRoleName = adminRoleName,
        adminPanelRoleName = adminPanelRoleName,
        banned = banned,
    }
    return flags
end

function arc.updatePlayer(userId)
    local whitelistedPlayersId = arc.returnWhitelistedPlayersId()
    if table.contains(whitelistedPlayersId, tonumber(userId)) then
        cachedPlayers[tostring(userId)] = returnAllPlayerFlags(userId)
    else
        cachedPlayers[tostring(userId)] = nil
    end
    return cachedPlayers[tostring(userId)]
end

function arc.loadPage(page, currentPlayerId, myId)
    local startIdx, endIdx = (page - 1) * itemsPerPage + 1, page * itemsPerPage
    local whitelistedPlayersId = arc.returnWhitelistedPlayersId()

    if not whitelistedPlayersId or #whitelistedPlayersId == 0 then
        print("Erro: Lista de jogadores permitidos está vazia ou inválida.")
        return false
    end

    for playerId in pairs(cachedPlayers) do
        if tonumber(playerId) < startIdx or tonumber(playerId) > endIdx then
            cachedPlayers[tostring(playerId)] = nil
        end
    end

    for i = startIdx, endIdx do
        local playerId = whitelistedPlayersId[i]
        if playerId then
            if Config.Panel.CollectOfflinePlayers or isPlayerOnline(playerId) then
                cachedPlayers[tostring(playerId)] = returnPlayerFlags(playerId)
            else
                cachedPlayers[tostring(playerId)] = nil
            end
        end
    end

    if tonumber(currentPlayerId) then
        cachedPlayers[tostring(currentPlayerId)] = returnAllPlayerFlags(tonumber(currentPlayerId))
    end
    if tonumber(myId) then
        cachedPlayers[tostring(myId)] = returnAllPlayerFlags(tonumber(myId))
    end

    return true
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.banPlayer(playerId, reason, cooldown, author) -- cooldown: dias | author: id
    if not author then
        author = 'AntiCheat'
    else
        author = ''..arc.returnPlayerFullName(author)..' ['..author..']'
    end
    local currentDate = os.time()
    local expirationDate
    cooldown = parseInt(cooldown)
    if not cooldown then
        return
    end
    if cooldown == -1 or cooldown == 0 then
        expirationDate = nil
    else
        expirationDate = currentDate + (cooldown * 24 * 60 * 60)
    end
    local playerSrc = arc.getPlayerSource(playerId)
    if playerSrc then
        if cooldown ~= 0 and cooldown ~= -1 then
            DropPlayer(playerSrc, 'Você foi banido do servidor por '..cooldown..' dias!\nMotivo: '..reason..'\nAutor do Banimento: '..author..'\nData de expiração: '..os.date("%d/%m/%Y | %H:%M:%S", expirationDate)..'')
        else
            DropPlayer(playerSrc, 'Você foi banido do servidor permanentemente!\nMotivo: '..reason..'\nAutor do Banimento: '..author..'')
        end
    end
    local formattedDate = os.date("%Y-%m-%d %H:%M:%S", currentDate)
    local identifiers = arc.collectPlayerIdentifiers(playerId)
    local query = [[
        INSERT INTO arc_bans (player_id, identifiers, reason, cooldown, author, date, expiration)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ]]
    local params = {
        playerId,
        json.encode(identifiers),
        reason,
        cooldown,
        author,
        formattedDate,
        expirationDate and os.date("%Y-%m-%d %H:%M:%S", expirationDate) or nil
    }
    arc.executeSync(query, params)
    updateGraph('ban')
end

function arc.unbanPlayer(playerId, banId)
    local query = [[
        SELECT ban_id FROM arc_bans WHERE ban_id = ?
    ]]
    local result = arc.executeSync(query, {banId})
    if playerId then
        query = [[
            SELECT ban_id FROM arc_bans WHERE player_id = ?
        ]]
        result = arc.executeSync(query, {playerId})
    end
    if #result > 0 then
        banId = result[1].ban_id
        local deleteQuery = [[
            DELETE FROM arc_bans WHERE ban_id = ?
        ]]
        arc.executeSync(deleteQuery, {banId})
        updateGraph('unban')
        return true
    end
    return false
end

function arc.returnBans()
    local query = [[
        SELECT * FROM arc_bans
    ]]
    local result = arc.executeSync(query)
    if #result > 0 then
        local bansData = {}
        for _, banInfo in ipairs(result) do
            local timestampInSeconds = tonumber(banInfo.date) / 1000
            local formattedDate = os.date("%d/%m/%Y | %H:%M:%S", timestampInSeconds)

            bansData[tostring(banInfo.ban_id)] = {
                identifiers = json.decode(banInfo.identifiers),
                infos = {
                    playerId = banInfo.player_id,
                    reason = banInfo.reason,
                    cooldown = banInfo.cooldown,
                    author = banInfo.author,
                    date = formattedDate,
                    expiration = banInfo.expiration
                }
            }
        end
        return bansData
    end
    return {}
end

function arc.isPlayerBanned(userid, playerInfos)
    if userid then
        local query = [[
            SELECT * FROM arc_bans WHERE player_id = ?
        ]]
        local result = arc.executeSync(query, {userid})

        if #result > 0 then
            return result[1], result[1].ban_id
        end
    end

    if playerInfos then
        local query = [[
            SELECT * FROM arc_bans WHERE JSON_CONTAINS(identifiers, ?)
        ]]

        local identifiersJson = json.encode(playerInfos)
        local result = arc.executeSync(query, {identifiersJson})

        if #result > 0 then
            return result[1], result[1].ban_id
        end
    end

    return false
end

AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    if not Config.Panel.EnableBans then
        return
    end
    local s = source
    deferrals.defer()
    Wait(100)
    deferrals.update("Verificando banimentos...")

    local playerInfos = arc.ExtractIdentifiers(s)
    local banInfo, banId = arc.isPlayerBanned(nil, playerInfos)

    if banInfo then
        local isPermanent = not banInfo.expiration
        local currentTime = os.time()

        local timestampInSeconds = tonumber(banInfo.expiration) / 1000
        local formattedDate = os.date("%d/%m/%Y | %H:%M:%S", timestampInSeconds)

        if not isPermanent and currentTime >= timestampInSeconds then
            arc.unbanPlayer(nil, banId)
            deferrals.done()
        else
            local banExpirationText
            if isPermanent then
                banExpirationText = "Banimento Permanente"
            else
                banExpirationText = "Data de Expiração: ".. formattedDate
            end

            deferrals.done("Você está banido!\n\nId do Banimento: "..banId.."\nMotivo: "..banInfo.reason.."\nBanido por: "..banInfo.author.."\n"..banExpirationText)
        end
    else
        deferrals.done()
    end
end)

----------------------------------------------------------------------------------------------------------------------------------------

function cleanOldReports()
    local days = Config.Panel.AutoRemoveReportsAfter
    if not parseInt(days) then return end
    local timeLimit = os.time() - (days * 24 * 60 * 60)

    local deleteQuery = [[
        DELETE FROM arc_reports 
        WHERE timestamp < ?
    ]]
    arc.executeSync(deleteQuery, {timeLimit})
    local selectQuery = [[
        SELECT report_id, messages 
        FROM arc_reports
    ]]
    local reports = arc.executeSync(selectQuery)
    local maxMessages = parseInt(Config.Panel.MaxChatMessages) or 30
    for _, report in ipairs(reports) do
        local messages = json.decode(report.messages or "[]")
        if #messages > maxMessages then
            while #messages > maxMessages do
                table.remove(messages, 1)
            end
            local updateQuery = [[
                UPDATE arc_reports 
                SET messages = ? 
                WHERE report_id = ?
            ]]
            arc.executeSync(updateQuery, {json.encode(messages), report.report_id})
        end
    end
end

function arc.returnReports(reportId)
    cleanOldReports()

    local query = [[
        SELECT report_id, description, author, author_name, date, type, concluded, concluded_by, concluded_date, timestamp
        FROM arc_reports
    ]]
    
    local result = arc.executeSync(query)

    if not result or #result == 0 then
        return {}
    end

    local reportsData = {}
    for _, report in ipairs(result) do
        local isConcluded = report.concluded and {
            author = report.concluded_by,
            date = report.concluded_date
        } or false
    
        reportsData[tostring(report.report_id)] = {
            description = report.description,
            images = {},
            author = report.author,
            authorName = report.author_name,
            date = report.date,
            type = report.type,
            concluded = isConcluded,
            timestamp = tonumber(report.timestamp),
            messages = {}
        }

        if reportId then
            local flags = arc.returnReportFlags(reportId)
            reportsData[tostring(report.report_id)].messages = flags.messages
            reportsData[tostring(report.report_id)].images = flags.images
        end
    end

    return reportsData
end

function arc.returnReportFlags(reportId)

    local query = [[
        SELECT images, messages
        FROM arc_reports
        WHERE report_id = ?
    ]]

    local result = arc.executeSync(query, { reportId })

    if not result or #result == 0 then
        return nil, "Report not found"
    end

    local report = result[1]
    local images = report.images and json.decode(report.images) or {}
    local messages = report.messages and json.decode(report.messages) or {}

    return {
        images = images,
        messages = messages
    }
end

--images = {'imageOne', 'imageTwo'...}
function arc.createReport(description, images, author, type) -- author: ID
    local query = [[
        INSERT INTO arc_reports (description, images, author, author_name, date, type, concluded, timestamp, messages)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ]]
    local formattedDate = os.date("%d/%m/%Y | %H:%M:%S", os.time())
    local messages = json.encode({})
    local params = {
        description,
        json.encode(images),
        author,
        arc.returnPlayerFullName(tonumber(author)),
        formattedDate,
        type,
        0,
        os.time(),
        messages
    }
    arc.executeSync(query, params)
    updateGraph('report_opened')
end

function arc.saveReport(reportId, concludedBy)
    local concludedAuthor = '' .. arc.returnPlayerFullName(concludedBy) .. ' [' .. concludedBy .. ']'
    local formattedDate = os.date("%d/%m/%Y | %H:%M:%S", os.time())
    local selectQuery = [[
        SELECT * FROM arc_reports WHERE report_id = ?
    ]]
    local report = arc.executeSync(selectQuery, {reportId})
    if #report > 0 then
        local updateQuery = [[
            UPDATE arc_reports
            SET concluded = 1, 
                concluded_by = ?, 
                concluded_date = ?
            WHERE report_id = ?
        ]]
        arc.executeSync(updateQuery, {concludedAuthor, formattedDate, reportId})
        updateGraph('report_concluded')
        
        arcClient.updateReports(-1)
    end
end

function arc.sendReportMessage(messagedata, reportId)
    local selectQuery = [[
        SELECT messages FROM arc_reports WHERE report_id = ?
    ]]
    local result = arc.executeSync(selectQuery, {reportId})
    if #result > 0 then
        local messages = result[1].messages and json.decode(result[1].messages) or {}
        table.insert(messages, messagedata)
        local updateQuery = [[
            UPDATE arc_reports SET messages = ? WHERE report_id = ?
        ]]
        arc.executeSync(updateQuery, {json.encode(messages), reportId})

        arcClient.updateReports(-1, reportId)
    end
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.receivePanelMessages(messageData)
    arcClient.receivePanelMessages(-1, messageData)
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.changeResourceState(resName, state)
    local s = source
    if state == 'start' then
        local resultStart = StartResource(resName)
        if resultStart then
            arcClient.sendNotify(s, 'success', 'Resource '..resName..' iniciado.', nil, true)
        end
    elseif state == 'stop' then
        local resultStop = StopResource(resName)
        if resultStop then
            arcClient.sendNotify(s, 'success', 'Resource '..resName..' parado.', nil, true)
        end
    elseif state == 'restart' then
        local resultStop = StopResource(resName)
        if resultStop then
            StartResource(resName)
            arcClient.sendNotify(s, 'success', 'Resource '..resName..' restartado.', nil, true)
        end
    end

    arcClient.updateResources(-1)
end

function arc.returnResources()
    local resourceList = {}
    local numResources = GetNumResources()

    for i = 0, numResources - 1 do
        local resourceName = GetResourceByFindIndex(i)
        if resourceName and resourceName ~= 'arc.lib' and resourceName ~= GetCurrentResourceName() then
            local status = GetResourceState(resourceName)
            if status then
                resourceList[resourceName] = {
                    status = status,
                    version = GetResourceMetadata(resourceName, "version", 0),
                    author = GetResourceMetadata(resourceName, "author", 0),
                }
            end
        end
    end
    return resourceList
end

----------------------------------------------------------------------------------------------------------------------------------------


----------------------------------------------------------------------------------------------------------------------------------------

function arc.addAdminPreset(name, permissions)
    local Config = json.decode(LoadResourceFile(GetCurrentResourceName(), 'cfg/cfg.json'))

    for k, v in pairs(Config.AdminsPreset) do
        if name == k then
            return 'name'
        elseif comparePermissions(v, permissions) then
            return 'permissions', k
        end
    end
    Config.AdminsPreset[name] = permissions
    SaveResourceFile(GetCurrentResourceName(), '/cfg/cfg.json', json.encode(Config, { indent = true }), -1)
    return true
end

function comparePermissions(existingPermissions, newPermissions)
    table.sort(existingPermissions)
    table.sort(newPermissions)
    for i = 1, #existingPermissions do
        if existingPermissions[i] ~= newPermissions[i] then
            return false
        end
    end
    return true
end

function arc.updateCfg(cfg)
    Config = cfg
    SaveResourceFile(GetCurrentResourceName(), '/cfg/cfg.json', json.encode(cfg, { indent = true }), -1)
    arcClient.updateCfg(-1, cfg)
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
---FUNCTIONS
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

local wallsActive = {}
function arc.ToggleWall(toggle)
    local s = source
    wallsActive[tostring(s)] = toggle
end

function arc.returnWallPlayerFlags(s)
    if s then
        local user_id = arc.returnPlayerId(s) or ''
        local name = arc.returnPlayerFullName(user_id) or ''
        local group = arc.returnPlayerRoleName(user_id) or ''
        local wall = wallsActive[tostring(s)] or false
        return {id = user_id, name = name, group = group, wall = wall}
    end
    return {}
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function arc.TeleportToCam(entity, x,y,z, vehicle)
    local s = source
    if vehicle then
        arcClient.Veh_TeleportToCam(entity, x,y,z)
    else
        arcClient.Teleport(entity, nil, x,y,z)
    end
end

function arc.SyncDelete(entity, type)
    arcClient.DeleteEntity(-1, entity, type)
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function arc.ChangeSkin(skin, id)
    local playerSource = arc.getPlayerSource(id)
    arcClient.ChangeSkin(playerSource, skin)
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function arc.Announce(msg)
    arcClient.sendNotify(-1, 'success', msg, nil, true)
end

function arc.SendPvNotify(id,msg)
    local source = source
    local s = arc.getPlayerSource(id)
    if s then
        arcClient.sendNotify(arc.getPlayerSource(id), 'success', msg, nil, true)
    else
        arcClient.sendNotify(source, 'error', 'Jogador offline.', nil, true)
    end
end

function arc.reviveGeral()
    arcClient.Revive(-1)
end

function arc.kickGeral()
    DropPlayer(-1, 'Todos os jogadores foram expulsos do servidor.')
end

function arc.killGeral()
    arcClient.Kill(-1)
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function arc.defineWeather(type)
    arcClient.defineWeather(-1,type)
end

function arc.defineHour(type)
    arcClient.defineHour(-1,type)
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

local PlayerFreezed = {}
function arc.FreezePlayer(s)
    if s then
        if not PlayerFreezed[s] then
            PlayerFreezed[s] = true
        else
            PlayerFreezed[s] = not PlayerFreezed[s]
        end
        arcClient.FreezePlayer(s, PlayerFreezed[s])
    else
        arcClient.sendNotify(s, 'error', 'Jogador Offline.')
    end
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function arc.Spectate(id)
    local s = source
    local player = arc.getPlayerSource(id)
    if player then
        arcClient.SpectatePlayer(s, player)
    else
        arcClient.sendNotify(s, 'error', 'Jogador Offline.')
    end
end

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function arc.Kick(s, reason)
    local source = source
    if s then
        DropPlayer(s, reason)
        arcClient.sendNotify(source,'success', 'Jogador expulso.')
    else
        arcClient.sendNotify(source,'error', 'Jogador Offline.')
    end
end