local pass1 = '/Arc'
local pass2 = '7322'

while not arcServer.initialized() or not arcServer.checkLib() do
    Wait(1000)
end

local scriptLicense, scriptVersion = arcServer.initialized()
while not arcServer.____res____started____(''..pass1..''..pass2..''..GetCurrentResourceName()..'_'..scriptLicense..'_'..scriptVersion..'') == ''..pass1..''..pass2..''..GetCurrentResourceName()..'_'..scriptLicense..'_'..scriptVersion..'' do
    Wait(1000)
end

--------------------------------------------------------------------------------------------------------------

local myId = nil
local Spawned = false
CreateThread(function ()
    while not Spawned do
        Wait(0)
        if GetEntityCoords(PlayerPedId()) then
            if arcServer.playerJoined() then
                Spawned = true
                print('Spawned')
                myId = arcServer.returnPlayerId()
                SendNUIMessage({
                    type = "spawn",
                    myId = myId,
                    myName = arcServer.returnPlayerFullName(myId),
                })
            else
                Wait(5000)
            end
        end
    end
end)

RegisterNUICallback('SaveConfig', function (cb)
    arcServer.updateCfg(cb)
end)

function arc.updateCfg(cfg)
    Config = cfg
    SendNUIMessage({
        type = 'update',
        scriptCfg = Config,
    })
end

--------------------------------------------------------------------------------------------------------------

local suspects = {}
local pendingSuspectGraphUpdates = 0
local authorNameCache = {}

function addSuspect(description,index,author,type) --author: ID
    local newId = 0
    for k, _ in pairs(suspects) do
        local numericKey = tonumber(k)
        if numericKey and numericKey > newId then
            newId = numericKey
        end
    end

    local userId = arcServer.returnPlayerId(author)
    local authorName = authorNameCache[userId]
    if not authorName then
        authorName = arcServer.returnPlayerFullName(userId)
        authorNameCache[userId] = authorName
    end

    newId = newId + 1

    local maxSuspects = parseInt(Config.Panel.MaxSuspects)
    if not maxSuspects then
        maxSuspects = 30
    end

    if #suspects >= maxSuspects then
        local oldestId = nil
        for k, _ in pairs(suspects) do
            if not oldestId or tonumber(k) < tonumber(oldestId) then
                oldestId = k
            end
        end
        suspects[oldestId] = nil
    end

    local suspectImage
    if type == 'prop' then
        suspectImage = 'https://gta-objects.xyz/gallery/objects/'..index..'.jpg'
    elseif type == 'ped' then
        for k,v in pairs(returnPedsList()) do
            if index == GetHashKey(tostring(k)) then
                suspectImage = 'https://docs.fivem.net/peds/'..k..'.webp'
            end
        end
    elseif type == 'vehicle' then
        suspectImage = 'https://docs.fivem.net/vehicles/'..index..'.webp'
    elseif type == 'weapon' then
        for k,v in pairs(returnWeapList()) do
            suspectImage = 'https://docs.fivem.net/weapons/'..string.upper(index)..'.png'
        end
    end

    local formattedDate = arcServer.getDate()
    suspects[tostring(newId)] = {
        description = description,
        image = suspectImage,
        author = userId,
        authorName = authorName,
        date = formattedDate,
        type = type,
    }

    addRegister(userId, 1, description)

    if pendingSuspectGraphUpdates == 10 then
        arcServer.updateGraph('suspect', 10)
        pendingSuspectGraphUpdates = 0
    end
end

--------------------------------------------------------------------------------------------------------------

local messages = {}

function arc.receivePanelMessages(messagesData)
    table.insert(messages, messagesData)
    local maxMessages = parseInt(Config.Panel.MaxChatMessages)
    if not maxMessages then
        maxMessages = 30
    end
    if #messages >= maxMessages then
        table.remove(messages, 1)
    end
    SendNUIMessage({
        type = "receiveMessages",
        messages = messages
    })
end

RegisterNUICallback('sendMessage', function (data)
    arcServer.receivePanelMessages(data.messageData)
end)

--------------------------------------------------------------------------------------------------------------

local registers = {}

local register_types = {
    [1] = {name = 'AntiCheat', importance = 1, color = 'red'},
    [2] = {name = 'Punishment', importance = 1, color = 'red'},
    [3] = {name = 'Staff Editor', importance = 1, color = 'red'},
    [4] = {name = 'Cfg Editor', importance = 1, color = 'red'},

    [5] = {name = 'Money', importance = 2, color = 'orange'},
    [6] = {name = 'Inventory', importance = 2, color = 'orange'},
    [7] = {name = 'Vehicle', importance = 2, color = 'orange'},
    [14] = {name = 'Weapons', importance = 2, color = 'orange'},

    [8] = {name = 'Groups', importance = 3, color = 'yellow'},
    [9] = {name = 'Report', importance = 3, color = 'yellow'},
    [10] = {name = 'Resource', importance = 3, color = 'yellow'},

    [11] = {name = 'Functions', importance = 4, color = 'green'},
    [12] = {name = 'Chat', importance = 4, color = 'green'},
    [13] = {name = 'Panel', importance = 4, color = 'green'},
}

local pendingRegisterGraphUpdates = 0
local maxId = 0
local minId = math.huge

function addRegister(author, type, description)
    local formattedDate = arcServer.getDate()
    local source
    

    if author ~= myId then
        source = arcServer.getPlayerSource(author)
    end

    local authorName = authorNameCache[author]
    if not authorName then
        authorName = arcServer.returnPlayerFullName(author)
        authorNameCache[author] = authorName
    end

    pendingRegisterGraphUpdates = pendingRegisterGraphUpdates + 1

    if pendingRegisterGraphUpdates == 10 then
        arcServer.updateGraph('register', 10)
        pendingRegisterGraphUpdates = 0
    end

    local newId = 0
    for k, _ in pairs(registers) do
        local numericKey = tonumber(k)
        if numericKey and numericKey > newId then
            newId = numericKey
        end
    end
    newId = newId + 1

    local maxRegisters = parseInt(Config.Panel.MaxRegisters)
    if not maxRegisters then
        maxRegisters = 200
    end
    maxId = maxId + 1
    if #registers >= maxRegisters then
        registers[tostring(minId)] = nil
        minId = minId + 1
    end

    local importance
    for k, v in pairs(register_types) do
        if type == k then
            type = v.name
            importance = v.importance
            local color = v.color

            if importance == 1 then
                if k == 1 then
                    arcServer.screenshot(Config.WebHooks[v.name], v.name, description, source)
                else
                    arcServer.DetailedLog(Config.WebHooks[v.name], v.name, description, color, source)
                end
            else
                arcServer.SimpleLog(Config.WebHooks[v.name], v.name, description, color, source)
            end
        end
    end

    registers[tostring(newId)] = {
        description = description,
        author = author,
        authorName = authorName,
        date = formattedDate,
        type = type,
        importance = importance
    }
end
--------------------------------------------------------------------------------------------------------------

RegisterNUICallback('changeResourceState', function (data)
    local resName = data.resName
    local state = data.state
    arcServer.changeResourceState(resName, state)
end)

function arc.updateResources()
    SendNUIMessage({
        type = "update",
        resources = arcServer.returnResources(),
    })
end

--------------------------------------------------------------------------------------------------------------

RegisterNUICallback('AddPreset', function(data)
    local addPreset, existenceName = arcServer.addAdminPreset(data.name, data.permissions)
    if addPreset == true then
        arc.sendNotify('success', 'Preset salvo com o nome "'..data.name..'"', nil, true)
        arc.updateCfg()
    elseif addPreset == 'name' then
        arc.sendNotify('error', 'Preset com o nome "'..data.name..'" ja existente.', nil, true)
    elseif addPreset == 'permissions' then
        arc.sendNotify('error', 'Preset com as permissões ja existente em "'..existenceName..'".', nil, true)
    end
end)

--------------------------------------------------------------------------------------------------------------

RegisterNUICallback('addRegister', function (data)
    addRegister(data.author, data.type, data.description)
end)

--------------------------------------------------------------------------------------------------------------

function arc.updateReports(reportId)
    local reports = arcServer.returnReports(reportId)
    SendNUIMessage({
        type = "update",
        reports = reports,
    })
end

RegisterNUICallback('updateReports', function (data)
    arc.updateReports(data.reportId)
end)

RegisterNUICallback('createReport', function (data)
    arcServer.createReport(data.description,data.images,myId,data.type)
end)

RegisterNUICallback('concluedReport', function (data)
    arcServer.saveReport(data.reportId, data.concluedBy)
end)

RegisterNUICallback('sendReportMessage', function (data)
    arcServer.sendReportMessage(data.messageData, data.reportId)
end)

local vehiclesList, rolesList, inventoryList, weaponsList = returnVehicleList(), arcServer.returnGroups(), arcServer.returnInventoryList(), returnWeapList()

RegisterNUICallback('loadGraph', function (data)
    local graphType = data.graphType
    local graphs = arcServer.returnFullGraph(graphType)
    SendNUIMessage({
        type = "update",
        graph = graphs,
    })
end)

RegisterNUICallback('updateGraphs', function ()
    local graphs = arcServer.returnGraphs()
    SendNUIMessage({
        type = "update",
        graph = graphs,
    })
end)

RegisterNUICallback('updateResources', function ()
    arc.updateResources()
end)

RegisterNUICallback('updatePage', function (data)
    local page = data.currentPageLoading
    if parseInt(page) then
        if arcServer.loadPage(parseInt(page), data.currentPlayerId, myId) then
            local playersData, playersCollected, playersQtd, adminsQtd = arcServer.returnCachedPlayers()
            SendNUIMessage({
                type = "update",

                onlinePlayersQuantity = playersQtd,
                onlineAdminsQuantity = adminsQtd,
        
                playersCollected = playersCollected,
                playersData = playersData,
            })
        end
    end
end)

--------------------------------------------------------------------------------------------------------------

local openCooldown = 0
local opened = false

local makingReport = false
RegisterCommand('report', function ()
    if opened then return end
    makingReport = not makingReport
    if makingReport then
        SendNUIMessage({
            type = 'report',
            toggle = makingReport,
            myReports = arcServer.returnMyReports()
        })
        SetNuiFocus(true, true)
    else
        leaveReportCreation()
    end
end)

function leaveReportCreation()
    makingReport = false
    SetNuiFocus(false,false)
    SendNUIMessage({
        type = 'report',
        toggle = makingReport,
    })
end

RegisterNUICallback('leaveReportCreation', function (cb)
    leaveReportCreation()
end)

RegisterCommand(Config.Panel.Command, function ()
    if makingReport then return end
    if arcServer.isStaff(myId) then
        if not opened then

            local currentTime = GetGameTimer()
            if currentTime - openCooldown <= 3000 then
                local remainingTime = 3000 - (currentTime - openCooldown)

                arc.sendNotify('error', "Cooldown ativo. Tente novamente em "..math.ceil(remainingTime/1000).." segundos.", nil, true)
            else
                opened = true
                addRegister(myId, 13, 'Abriu o Painel.')
                openCooldown = currentTime

                arc.sendNotify('success', "Carregando Painel.")
                if arcServer.loadPage(1, myId) then
                    local playersData, playersCollected, playersQtd, adminsQtd, bans, reports, staffsList = arcServer.returnPanelInfos()
                    SendNUIMessage(
                    {
                        type = 'Open',

                        myId = myId,
                        messages = messages,

                        onlinePlayersQuantity = playersQtd,
                        onlineAdminsQuantity = adminsQtd,

                        playersCollected = playersCollected,
                        playersData = playersData,

                        scriptCfg = Config,

                        registers = registers,
                        bans = bans,
                        vehicle = vehiclesList,
                        inventory = inventoryList,
                        weapons = weaponsList,
                        roles = rolesList,
                        suspects = suspects,
                        reports = reports,
                        staffsList = staffsList
                    })
                    SetNuiFocus(true,true)
                end
            end
        else
            ClosePanel()
        end
    else
        arc.sendNotify('error', "Sem permissao.")
    end
end)

RegisterKeyMapping(Config.Panel.Command, 'Abrir Painel Admin.', 'keyboard', 'F7')

function ClosePanel()
    opened = false
    SendNUIMessage({type = 'Close'})
    SetNuiFocus(false)
    addRegister(myId, 13, 'Fechou o Painel.')
end

function arc.sendNotify(type, message, audioType, important, realTime)
    if type and message then
        SendNUIMessage({
            type = 'notify',
            notifyType = type,
            message = message,
            audioType = audioType,
            important = important,
            realTime = realTime or false
        })
    end
end

RegisterNUICallback('closePanel', function ()
    ClosePanel()
end)


RegisterNUICallback("updatePlayer", function(data)
    SendNUIMessage({
        type = 'update',
        playerInfos = arcServer.updatePlayer(data.currentPlayerId),
        playerId = data.currentPlayerId
    })
end)

----------------------------------------------------------------------------------------------------------------------------------------

RegisterNUICallback("addStaff", function(data, cb)
    if arcServer.addStaff(data.newStaffId, data.newStaffType, data.newStaffPermissions) then
        arc.sendNotify('success', 'Staff de ID "'..data.newStaffId..'" e tipo "'..data.newStaffType..'" adicionado.', nil, true)
        SendNUIMessage(
        {
            type = 'update',
            staffsList = arcServer.returnStaffs(),
        })
    else
        arc.sendNotify('error', 'Staff ja existente.', nil, true)
    end
end)

RegisterNUICallback("remStaff", function(data)
    if arcServer.remStaff(data.staffId) then
        SendNUIMessage(
        {
            type = 'update',
            staffsList = arcServer.returnStaffs(),
        })
    else
        arc.sendNotify('error', 'Staff nao existente.', nil, true)
    end
end)

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
---FUNCTIONS
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

local wall,wall_lines,wall_dist = false, false, 500
local wall_playersInfos = {}
RegisterNUICallback("Wall", function (cb)
    wall = cb.toggle
    arcServer.ToggleWall(cb.toggle)
    if wall then
        wall_lines = cb.lines
        wall_dist = cb.wallDist
    else
        wall_lines = false
    end
end)

CreateThread(function ()
	while true do
		local arcano = 1500
		if wall then
			for k,id in ipairs(GetActivePlayers()) do
				if NetworkIsPlayerActive(id) and GetPlayerPed(id) ~= PlayerPedId() then
					local playerInfo = wall_playersInfos[id]
					if playerInfo then
						local hp = GetEntityHealth(GetPlayerPed(id))
                        if hp > GetEntityMaxHealth(GetPlayerPed(id))/1.5 then
                            hp = '~g~'..GetEntityHealth(GetPlayerPed(id))
                        elseif hp <= GetEntityMaxHealth(GetPlayerPed(id))/1.5 and hp > GetEntityMaxHealth(GetPlayerPed(id))/3 then
                            hp = '~y~'..GetEntityHealth(GetPlayerPed(id))
                        elseif hp <= GetEntityMaxHealth(GetPlayerPed(id))/3 and hp > GetEntityMaxHealth(GetPlayerPed(id))/5 then
                            hp = '~o~'..GetEntityHealth(GetPlayerPed(id))
                        elseif hp <= GetEntityMaxHealth(GetPlayerPed(id))/8 then
                            hp = '~r~'..GetEntityHealth(GetPlayerPed(id))
                        end
						local weapon = GetSelectedPedWeapon(GetPlayerPed(id))
						if weapon == 0 or weapon == nil or weapon == GetHashKey("WEAPON_UNARMED") then
							weapon = ""
						else
                            for category, weapons in pairs(returnWeapList()) do
                                for weapHash, weapName in pairs(weapons) do
                                    if weapon == GetHashKey(weapHash) then
                                        weapon = weapName
                                    end
                                end
                            end
						end
						local x,y,z = table.unpack(GetEntityCoords(GetPlayerPed(id)))
						local x2,y2,z2 = table.unpack(GetEntityCoords(PlayerPedId()))

                        local wallEnabled = playerInfo.wall
                        if wallEnabled then
                            wallEnabled = '~g~[WALL]'
                        else
                            wallEnabled = ''
                        end

						local distancia = math.floor(GetDistanceBetweenCoords(x, y, z, x2, y2, z2))
						if distancia <= wall_dist then
							arcano = 1
							DrawText3D(x, y, z + 1.5, ""..hp.." ~w~| ~b~"..distancia.."m\n~w~[~b~"..playerInfo.id.."~w~] "..playerInfo.name.."\n~b~"..playerInfo.group.."\n"..wallEnabled.."")
							if weapon then
								DrawText3D(x,y,z-1.5, "~b~"..weapon.."")
							end
                            if wall_lines then
                                if IsEntityVisible(GetPlayerPed(id)) then
                                    DrawLine(x2, y2, z2-0.3, x, y, z, 0, 0, 255, 255)
                                else
                                    DrawLine(x2, y2, z2-0.3, x, y, z, 255, 0, 0, 255)
                                end
                            end
						end
					end
				end
			end
		end
		Wait(arcano)
	end
end)

CreateThread(function ()
    while true do
        local arcano = 1000
        if wall then
            for k, id in ipairs(GetActivePlayers()) do
				local psource = GetPlayerServerId(id)
				local playerFlags = arcServer.returnWallPlayerFlags(psource)
				if playerFlags then
					wall_playersInfos[id] = playerFlags
				end
			end
        end
        Wait(arcano)
    end
end)

-------------------

local Noclip = false
local FirstH = nil
local NcVeh = nil
RegisterNUICallback("NoClip", function (cb)
    Noclip = cb.toggle
    if Noclip then
        SetEntityVisible(PlayerPedId(), false)
		if IsPedInAnyVehicle(PlayerPedId()) then
			NcVeh = GetVehiclePedIsIn(PlayerPedId(), false)
			FirstH = GetEntityHeading(PlayerPedId())
			SetEntityAlpha(NcVeh, 50)
		end
    else
        SetEntityVisible(PlayerPedId(), true)
		if NcVeh ~= nil then
			FirstH = nil
			SetEntityAlpha(NcVeh, 255)
		end
    end
end)

function getCamDirection()
	local heading = GetGameplayCamRelativeHeading()+GetEntityHeading(PlayerPedId())
	local pitch = GetGameplayCamRelativePitch()
	local x = -math.sin(heading*math.pi/180.0)
	local y = math.cos(heading*math.pi/180.0)
	local z = math.sin(pitch*math.pi/180.0)
	local len = math.sqrt(x*x+y*y+z*z)
	if len ~= 0 then
		x = x/len
		y = y/len
		z = z/len
	end
	return x,y,z
end

CreateThread(function()
    local speed = 1.0 -- Velocidade inicial
    while true do
        local arcano = 500
        if Noclip then
            arcano = 0
            local ped = PlayerPedId()
            if IsPedInAnyVehicle(PlayerPedId()) then
                ped = GetVehiclePedIsIn(PlayerPedId(), false)
                SetEntityHeading(ped, FirstH)
            end

            local x, y, z = table.unpack(GetEntityCoords(PlayerPedId()))
            local dx, dy, dz = getCamDirection()
            SetEntityVelocity(ped, 0.0001, 0.0001, 0.0001)

            if IsControlJustPressed(1, 241) then -- Scroll Up
                speed = speed + 1.0
				if speed > 15.0 then
                    speed = 15.0
                end
            elseif IsControlJustPressed(1, 242) then -- Scroll Down
                speed = speed - 1.0
                if speed < 0.1 then
                    speed = 0.1
                end
            end

            if IsControlPressed(0, 21) then -- Shift (cima)
                z = z + speed * 0.1
            elseif IsControlPressed(0, 36) or IsDisabledControlPressed(0, 36) then -- Ctrl (baixo)
                z = z - speed * 0.1
            end

            local rightVectorX = -dy
            local rightVectorY = dx
            if IsControlPressed(0, 32) then -- W (frente)
                x = x + speed * dx
                y = y + speed * dy
                z = z + speed * dz
            elseif IsControlPressed(0, 33) then -- S (atras)
                x = x - speed * dx
                y = y - speed * dy
                z = z - speed * dz
            elseif IsControlPressed(0, 34) then -- A (esquerda)
                x = x + speed * rightVectorX
                y = y + speed * rightVectorY
            elseif IsControlPressed(0, 35) then -- D (direita)
                x = x - speed * rightVectorX
                y = y - speed * rightVectorY
            end

            SetEntityCoordsNoOffset(ped, x, y, z, true, true, true)
        end
        Wait(arcano)
    end
end)

-------------------

local aimbot = false
RegisterNUICallback("Aimbot", function (cb)
    aimbot = cb.toggle
end)

CreateThread(function()
    while true do
        local arcano = 1500
        if aimbot then
            arcano = 1
            local closestPlayer, closestDist = nil, 1.0
            for k, id in ipairs(GetActivePlayers()) do
                local x1, y1, z1 = table.unpack(GetEntityCoords(PlayerPedId(), true))
                local x2, y2, z2 = table.unpack(GetEntityCoords(GetPlayerPed(id)))
                local distance = math.floor(GetDistanceBetweenCoords(x1, y1, z1, x2, y2, z2, true))
                local T, _x, _y = GetScreenCoordFromWorldCoord(x2, y2, z2)
                if distance <= 400 then
                    if IsDisabledControlPressed(0, 21) and IsDisabledControlPressed(0, 25) then
                        if GetPlayerPed(id) ~= PlayerPedId() and IsEntityOnScreen(GetPlayerPed(id)) and IsPedAPlayer(GetPlayerPed(id)) then
                            if HasEntityClearLosToEntity(PlayerPedId(), GetPlayerPed(id), 17) then
                                if GetEntityHealth(GetPlayerPed(id)) > 101 and IsEntityVisible(GetPlayerPed(id)) then
                                    local distToCenter = math.abs(_x - 0.5) + math.abs(_y - 0.5)
                                    if distToCenter < closestDist then
                                        closestDist = distToCenter
                                        closestPlayer = id
                                    end
                                end
                            end
                        end
                    end
                end
            end
            if closestPlayer then
                local cJ = GetPedBoneCoords(GetPlayerPed(closestPlayer), 25260)
                local cL, cM = GetFinalRenderedCamCoord(), GetEntityRotation(PlayerPedId(), 2)
                local cN, cO, cP = (cJ - cL).x, (cJ - cL).y, (cJ - cL).z
                local cQ = -math.deg(math.atan2(cN, cO)) - cM.z
                local aX = math.deg(math.atan2(cP, #vector3(cN, cO, 0.0)))
                local cR = 1.5
                if math.abs(cQ) < 10 then
                    SetGameplayCamRelativeRotation(cQ, aX, cR)
                end
            end
        end
        Wait(arcano)
    end
end)

-------------------

local fcam = nil
local FreeCam = false
local camZoom,camZoomMATH = 80.0, 0

RegisterNUICallback("Freecam", function (cb)
    toggleFreeCam()
end)

function toggleFreeCam()
	FreeCam = not FreeCam
	if FreeCam then
		SetCurrentPedWeapon(PlayerPedId(), GetHashKey("WEAPON_UNARMED"))
		fcam = CreateCam('DEFAULT_SCRIPTED_CAMERA', 1)
		local rot = GetGameplayCamRot(2)
		SetCamCoord(fcam, GetGameplayCamCoord().x, GetGameplayCamCoord().y, GetGameplayCamCoord().z+0.5)
		SetCamRot(fcam, rot.x, rot.y, rot.z, 2)
		SetCamFov(fcam, camZoom)
		SetCamActive(fcam, true)
		RenderScriptCams(true, true, 500, true, true)
	else
		camZoom = 80.0
		camZoomMATH = 0
		SetCamActive(fcam, false)
        DestroyCam(fcam, false)
        RenderScriptCams(false, true, 500, true, true)
        ClearFocus()
	end
end

local FreeCameraButtons = {
	{
		["label"] = "Rapido",
		["button"] = "~INPUT_SPRINT~"
	},
	{
		["label"] = "Devagar",
		["button"] = "~INPUT_DUCK~"
	},
	{
		["label"] = "+ Zoom",
		["button"] = "~INPUT_SELECT_PREV_WEAPON~"
	},
	{
		["label"] = "- Zoom",
		["button"] = "~INPUT_SELECT_NEXT_WEAPON~"
	},
	{
		["label"] = "Teleportar",
		["button"] = "~INPUT_JUMP~"
	},
}

local FreeCameraButtonsExtras = {
	{
		["label"] = "Rapido",
		["button"] = "~INPUT_SPRINT~"
	},
	{
		["label"] = "Devagar",
		["button"] = "~INPUT_DUCK~"
	},
	{
		["label"] = "+ Zoom",
		["button"] = "~INPUT_SELECT_PREV_WEAPON~"
	},
	{
		["label"] = "- Zoom",
		["button"] = "~INPUT_SELECT_NEXT_WEAPON~"
	},
	{
		["label"] = "Teleportar",
		["button"] = "~INPUT_JUMP~"
	},
	{
		["label"] = "Puxar",
		["button"] = "~INPUT_SCRIPT_RT~"
	},
	{
		["label"] = "Curar",
		["button"] = "~INPUT_PICKUP~"
	},
	{
		["label"] = "Deletar",
		["button"] = "~INPUT_CELLPHONE_OPTION~"
	},
}

function arc.Veh_TeleportToCam(x,y,z)
	local vehicle = GetVehiclePedIsUsing(PlayerPedId())
	SetEntityCoords(vehicle, x,y,z)
end

function arc.DeleteEntity(entity, type)
	local Entity
	if type == 'obj' then
		Entity = NetToObj(entity)
	elseif type == 'veh' then
		Entity = NetToVeh(entity)
	elseif type == 'ped' then
		Entity = NetToPed(entity)
	end

	if DoesEntityExist(Entity) then
		NetworkRequestControlOfEntity(Entity)
		SetEntityAsMissionEntity(Entity, true,true)
		SetNetworkIdExistsOnAllMachines(entity, true)
		SetEntityAsNoLongerNeeded(Entity)
		DeleteEntity(Entity)
		SetEntityVisible(Entity, false)
		SetEntityCollision(Entity, false, false)
	end
end

local prop_list = {}
local propName = {}
function loadPropList()
    local file = LoadResourceFile(GetCurrentResourceName(), 'list/props.txt')
    if file then
        local id = 1
        for line in string.gmatch(file, "[^\r\n]+") do
            prop_list[id] = line
            id = id + 1
        end
    end
end

local lastEntity,lastPlayer = nil,nil
CreateThread(function ()
	while not RequestResourceFileSet('props') do
        Wait(100)
    end
    loadPropList()
	while true do
		local arcano = 1000
		if FreeCam then
			arcano = 1
			DisableAllControlActions(0)
			DrawRect(0.5, 0.5, 0.001, 0.005, 255, 255, 255, 230)
            DrawRect(0.5, 0.5, 0.003, 0.001, 255, 255, 255, 230)
			local camCoords = GetCamCoord(fcam)
			local camRot = GetCamRot(fcam)
			local forward, right = RotToQuat(camRot) * vector3(0.0, 1.0, 0.0), RotToQuat(camRot) * vector3(1.0, 0.0, 0.0)
			local freecamSpeed = 1 / 5
			local cud, clr = GetDisabledControlNormal(0, 2), GetDisabledControlNormal(0, 1)
			local newCamRot = vector3(camRot.x - cud * 8.0, camRot.y, camRot.z - clr * 8.0)

			if IsDisabledControlPressed(0, 21) then
				freecamSpeed = freecamSpeed * 20
			elseif IsDisabledControlPressed(0, 36) then
				freecamSpeed = freecamSpeed / 3
			end

			if IsDisabledControlPressed(0, 32) then camCoords = camCoords + forward * freecamSpeed end
			if IsDisabledControlPressed(0, 33) then camCoords = camCoords + forward * - freecamSpeed end
			if IsDisabledControlPressed(0, 30) then camCoords = camCoords + right * freecamSpeed end
			if IsDisabledControlPressed(0, 34) then camCoords = camCoords + right * - freecamSpeed end

			if IsDisabledControlPressed(0, 17) then -- SCROLLWHEEL UP
				if camZoomMATH < 80.0 then
					camZoom = camZoom - 3.0
					camZoomMATH = camZoomMATH + 3.0
					SetCamFov(fcam, camZoom)
				end
			elseif IsDisabledControlPressed(0, 16) then -- SCROLLWHEEL DOWN
				if camZoom < 100 then
					camZoom = camZoom + 3.0
					camZoomMATH = camZoomMATH - 3.0
					SetCamFov(fcam, camZoom)
				end
			end

			SetCamCoord(fcam, camCoords.x, camCoords.y, camCoords.z)
			SetFocusPosAndVel(camCoords.x, camCoords.y, camCoords.z, 0, 0, 0)
            DisplayRadar(true)
            SetRadarZoomLevelThisFrame(130.0)
			SetCamControlsMiniMapHeading(fcam, true)

			local ret, hit, endc, surf, entity = GetShapeTestResult(StartExpensiveSynchronousShapeTestLosProbe(camCoords.x, camCoords.y, camCoords.z, camCoords.x + forward.x * 1000.0, camCoords.y + forward.y * 1000.0, camCoords.z + forward.z * 1000.0, -1, 0, 1))
			SetCamRot(fcam, newCamRot.x < -85.0 and -85.0 or newCamRot.x > 100.0 and 100.0 or newCamRot.x, newCamRot.y, newCamRot.z, 0)

			if IsDisabledControlJustPressed(0, 22) and not IsPedAPlayer(entity) and not IsEntityAnObject(entity) and not IsEntityAVehicle(entity) and not IsEntityAPed(entity) then --Teleportar
				if hit ~= 0 and Vdist(camCoords.x,camCoords.y,camCoords.z, endc.x, endc.y, endc.z) <= 180 then
					SetEntityCoords(PlayerPedId(), endc.x, endc.y, endc.z)
				else
					SetEntityCoords(PlayerPedId(), camCoords.x + forward.x * 4.0, camCoords.y + forward.y * 4.0, camCoords.z + forward.z * 4.0)
				end
			end

			if DoesEntityExist(entity) and IsPedAPlayer(entity) or IsEntityAnObject(entity) or IsEntityAVehicle(entity) or IsEntityAPed(entity) then
				if lastEntity ~= entity and not IsPedAPlayer(entity) and not IsEntityAPed(entity) then
					SetEntityDrawOutline(lastEntity, false)
					lastEntity = entity
				end
				if lastPlayer ~= entity then
					SetEntityAlpha(entity, 255)
				else
					SetEntityAlpha(entity, 130)
				end
				if IsPedAPlayer(entity) or IsEntityAPed(entity) then
					boundbox(entity, {r=0, g=255, b=255, a=255})
					boundboxfill(entity, {r=0, g=0, b=0, a=100})
					drawSkeleton(entity, {r=0, g=255, b=255, a= 255})
					lastPlayer = entity
				end
				if lastEntity then
					SetEntityDrawOutlineColor(0,255,255,255)
					SetEntityDrawOutline(lastEntity, true)
				end
				DrawRect(0.5, 0.5, 0.001, 0.005, 0, 223, 255, 230)
				DrawRect(0.5, 0.5, 0.003, 0.001, 0, 223, 255, 230)
				DrawButtonsHelp(FreeCameraButtonsExtras)
				local x2,y2,z2 = table.unpack(GetEntityCoords(entity))

				if IsDisabledControlJustPressed(0, 22) then --Teleportar
					SetEntityCoordsNoOffset(PlayerPedId(), x2,y2,z2+1.0, true, true, true)
				end

				if IsDisabledControlJustPressed(0, 178) then --Deletar
					if IsEntityAnObject(entity) and DoesEntityExist(entity) then
						if not NetworkGetEntityIsNetworked(entity) then
                            NetworkRegisterEntityAsNetworked(entity)
                        end
                        if NetworkDoesEntityExistWithNetworkId(ObjToNet(entity)) then
						    SetNetworkIdCanMigrate(ObjToNet(entity))
						    arcServer.SyncDelete(ObjToNet(entity), 'obj')
                        end
					elseif IsEntityAPed(entity) and not IsPedAPlayer(entity) then
                        arcServer.SyncDelete(PedToNet(entity), 'ped')
					elseif IsEntityAVehicle(entity) then
                        arcServer.SyncDelete(VehToNet(entity), 'veh')
					end
				end


				if IsDisabledControlJustPressed(0, 229) and IsPedAPlayer(entity) then
					arcServer.TeleportToCam(GetPlayerServerId(NetworkGetPlayerIndexFromPed(entity)), camCoords.x + forward.x * 4.0, camCoords.y + forward.y * 4.0, camCoords.z + forward.z * 4.0)
				elseif IsDisabledControlJustPressed(0, 229) then
					local ped = GetPedInVehicleSeat(entity, -1)
					if IsPedAPlayer(ped) then
						arcServer.TeleportToCam(GetPlayerServerId(NetworkGetPlayerIndexFromPed(ped)), camCoords.x + forward.x * 4.0, camCoords.y + forward.y * 4.0, camCoords.z + forward.z * 4.0, true)
					else
						SetEntityCoords(entity, camCoords.x + forward.x * 4.0, camCoords.y + forward.y * 4.0, camCoords.z + forward.z * 4.0)
					end
					SetEntityDynamic(entity, true)
					SetObjectTextureVariation(entity, 10)
				end
		
				if IsDisabledControlJustPressed(0, 38) then --Curar
					if IsPedAPlayer(entity) then
                        arc.Revive(GetPlayerPed(GetPlayerFromServerId(entity)))
					else
						SetEntityHealth(entity, GetEntityMaxHealth(entity))
					end
				end

				local x,y,z = camCoords.x, camCoords.y, camCoords.z
				local distance = math.floor(GetDistanceBetweenCoords(x,y,z, x2, y2, z2))
				local hp = GetEntityHealth(entity)
				local Hash = GetEntityModel(entity)
				local h = GetEntityHeading(entity)

				if IsEntityAnObject(entity) then
					for id, prop in pairs(prop_list) do
						if GetHashKey(prop) == Hash then
							if propName[Hash] == nil then
								propName[Hash] = prop
							end
						end
					end
					if propName[Hash] ~= nil then
						DrawText3D(x2,y2,z2, '[~b~'..distance..'m~w~]\nHP: ~b~'..hp..'\n~w~Name: ~b~'..propName[Hash]..'')
					else
						DrawText3D(x2,y2,z2, '[~b~'..distance..'m~w~]\nHP: ~b~'..hp..'\n~w~Hash: ~b~'..Hash..'')
					end
					DrawText3D(x2,y2,z2-2.0, '~w~X = ~b~'..math.floor(x2)..' ~w~Y = ~b~'..math.floor(y2)..' ~w~Z = ~b~'..math.floor(z2)..' ~w~H = ~b~'..math.floor(h)..'')
				elseif IsEntityAVehicle(entity) then
					local VehModel = GetEntityModel(entity)
					local VehName = GetDisplayNameFromVehicleModel(VehModel)
					DrawText3D(x2,y2,z2, '[~b~'..distance..'m~w~]\nHP: ~b~'..hp..'\n~w~Name: ~b~'..VehName..'')
					DrawText3D(x2,y2,z2-2.0, '~w~X = ~b~'..math.floor(x2)..' ~w~Y = ~b~'..math.floor(y2)..' ~w~Z = ~b~'..math.floor(z2)..' ~w~H = ~b~'..math.floor(h)..'')
				elseif IsEntityAPed(entity) and not IsPedAPlayer(entity) then
					DrawText3D(x2,y2,z2, '[~b~'..distance..'m~w~]\nHP: ~b~'..hp..'\n~w~Hash: ~b~'..Hash..'')
					DrawText3D(x2,y2,z2-2.0, '~w~X = ~b~'..math.floor(x2)..' ~w~Y = ~b~'..math.floor(y2)..' ~w~Z = ~b~'..math.floor(z2)..' ~w~H = ~b~'..math.floor(h)..'')
				end
			else
				DrawButtonsHelp(FreeCameraButtons)
				if lastEntity then
					SetEntityDrawOutline(lastEntity, false)
					lastEntity = nil
				end
				if lastPlayer then
					SetEntityAlpha(lastPlayer, 255)
					lastPlayer = nil
				end
			end
		else
			if lastEntity then
				SetEntityDrawOutline(lastEntity, false)
				lastEntity = nil
			end
			if lastPlayer then
				SetEntityAlpha(lastPlayer, 255)
				lastPlayer = nil
			end
		end
		Wait(arcano)
	end
end)

function RotToQuat(rot) 
	local pitch, roll, yaw = math.rad(rot.x), math.rad(rot.y), math.rad(rot.z)
	local cy, sy, cr, sr, cp, sp = math.cos(yaw*0.5), math.sin(yaw*0.5), math.cos(roll*0.5), math.sin(roll*0.5), math.cos(pitch*0.5), math.sin(pitch*0.5)
	return quat(cy * cr * cp + sy * sr * sp, cy * sp * cr - sy * cp * sr, cy * cp * sr + sy * sp * cr, sy * cr * cp - cy * sr * sp)
end

function drawSkeleton(ped, color)
	DrawLine(GetPedBoneCoords(ped, 31086), GetPedBoneCoords(ped, 0x9995), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x9995), GetEntityCoords(ped), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x5C57), GetEntityCoords(ped), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x192A), GetEntityCoords(ped), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x3FCF), GetPedBoneCoords(ped,0x192A), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0xCC4D), GetPedBoneCoords(ped, 0x3FCF), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0xB3FE), GetPedBoneCoords(ped, 0x5C57), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0xB3FE), GetPedBoneCoords(ped, 0x3779), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x9995), GetPedBoneCoords(ped, 0xB1C5), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0xB1C5), GetPedBoneCoords(ped, 0xEEEB), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0xEEEB), GetPedBoneCoords(ped, 0x49D9), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x9995), GetPedBoneCoords(ped, 0x9D4D), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x9D4D), GetPedBoneCoords(ped, 0x6E5C), color.r, color.g, color.b, color.a)
	DrawLine(GetPedBoneCoords(ped, 0x6E5C), GetPedBoneCoords(ped, 0xDEAD), color.r, color.g, color.b, color.a)
end

function boundbox(ped, color)
    local model = GetEntityModel(ped)
    local min, max = GetModelDimensions(model)

    max = vector3(max.x - 0.2, max.y + 0.15, max.z)
    min = vector3(min.x + 0.2, min.y - 0.15, min.z + 0.2)

    local points = {
        {max.x, max.y, max.z}, -- b1
        {max.x, min.y, max.z}, -- b2
        {max.x, max.y, min.z}, -- b3
        {max.x, min.y, min.z}, -- b4
        {min.x, max.y, max.z}, -- a1
        {min.x, min.y, max.z}, -- c1
        {min.x, max.y, min.z}, -- a2
        {min.x, min.y, min.z}  -- a5
    }

    local lines = {
        {1, 2}, {2, 4}, {3, 4}, {3, 1},
        {5, 6}, {6, 8}, {7, 8}, {7, 5},
        {1, 5}, {2, 6}, {3, 7}, {4, 8}
    }

    for _, line in ipairs(lines) do
        local start = GetOffsetFromEntityInWorldCoords(ped, points[line[1]][1], points[line[1]][2], points[line[1]][3])
        local finish = GetOffsetFromEntityInWorldCoords(ped, points[line[2]][1], points[line[2]][2], points[line[2]][3])
        DrawLine(start.x + 0.001, start.y + 0.001, start.z + 0.001, finish.x + 0.001, finish.y + 0.001, finish.z + 0.001, color.r, color.g, color.b, color.a)
        DrawLine(start.x, start.y, start.z, finish.x, finish.y, finish.z, color.r, color.g, color.b, color.a)
        DrawLine(start.x - 0.001, start.y - 0.001, start.z - 0.001, finish.x - 0.001, finish.y - 0.001, finish.z - 0.001, color.r, color.g, color.b, color.a)
    end
end

function boundboxfill(ped, color)
    local model = GetEntityModel(ped)
    local min, max = GetModelDimensions(model)

    max = vector3(max.x - 0.2, max.y + 0.15, max.z)
    min = vector3(min.x + 0.2, min.y - 0.15, min.z + 0.2)

    local b1 = GetOffsetFromEntityInWorldCoords(ped, max)
    local b2 = GetOffsetFromEntityInWorldCoords(ped, vector3(max.x, min.y, max.z))
    local b3 = GetOffsetFromEntityInWorldCoords(ped, vector3(max.x, max.y, min.z))
    local b4 = GetOffsetFromEntityInWorldCoords(ped, vector3(max.x, min.y, min.z))
    local a1 = GetOffsetFromEntityInWorldCoords(ped, vector3(min.x, max.y, max.z))
    local c1 = GetOffsetFromEntityInWorldCoords(ped, vector3(min.x, min.y, max.z))
    local a2 = GetOffsetFromEntityInWorldCoords(ped, vector3(min.x, max.y, min.z))
    local a5 = GetOffsetFromEntityInWorldCoords(ped, min)

    local polygons = {
        {a1, b1, b3},
        {b3, a2, a1},
        {b1, a1, b2},
        {a1, c1, b2},
        {b2, c1, b4},
        {c1, a5, b4},
        {c1, a1, a2},
        {a2, a5, c1},
        {b1, b2, b3},
        {b2, b4, b3},
        {a2, b3, b4},
        {b4, a5, a2}
    }

    for _, polygon in ipairs(polygons) do
        DrawPoly(polygon[1], polygon[2], polygon[3], color.r, color.g, color.b, color.a)
    end
end

function DrawButtonsHelp(buttonTable)
    Citizen.CreateThread(function()
        local instructionScaleform = RequestScaleformMovie("instructional_buttons")

        while not HasScaleformMovieLoaded(instructionScaleform) do
            Wait(0)
        end

        PushScaleformMovieFunction(instructionScaleform, "CLEAR_ALL")
        PushScaleformMovieFunction(instructionScaleform, "TOGGLE_MOUSE_BUTTONS")
        PushScaleformMovieFunctionParameterBool(0)
        PopScaleformMovieFunctionVoid()

        for buttonIndex, buttonData in ipairs(buttonTable) do
            PushScaleformMovieFunction(instructionScaleform, "SET_DATA_SLOT")
            PushScaleformMovieFunctionParameterInt(buttonIndex - 1)
            PushScaleformMovieMethodParameterButtonName(buttonData["button"])
            PushScaleformMovieFunctionParameterString(buttonData["label"])
            PopScaleformMovieFunctionVoid()
        end

        PushScaleformMovieFunction(instructionScaleform, "DRAW_INSTRUCTIONAL_BUTTONS")
        PushScaleformMovieFunctionParameterInt(-1)
        PopScaleformMovieFunctionVoid()
        DrawScaleformMovieFullscreen(instructionScaleform, 255, 255, 255, 255)
    end)
end

-------------------

RegisterNUICallback("ChangeSkin", function (cb)
    arcServer.ChangeSkin(cb.skinName, cb.id)
end)

-------------------

RegisterNUICallback("Revive", function (cb)
    arc.Revive(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(cb.id))))
    arc.sendNotify('success', 'Jogador "'..cb.id..'" revivido.')
end)

-------------------

RegisterNUICallback("Armour", function (cb)
    arc.Armour(GetPlayerPed(GetPlayerFromServerId(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(cb.id))))))
    arc.sendNotify('success', 'Jogador "'..cb.id..'" adicionado colete.')
end)

-------------------

RegisterNUICallback("Kill", function (cb)
    arc.Kill(GetPlayerPed(GetPlayerFromServerId(arcServer.Kill(cb.id))))
    arc.sendNotify('success', 'Jogador "'..cb.id..'" morto.')
end)

-------------------

RegisterNUICallback("TpWay", function (cb)
    local ped = PlayerPedId()
	local veh = GetVehiclePedIsUsing(ped)
	if IsPedInAnyVehicle(ped) then
		ped = veh
    end
	local waypointBlip = GetFirstBlipInfoId(8)
    local blipCoord = GetBlipInfoIdCoord(waypointBlip)
	local x, y, z = table.unpack(blipCoord)
	local ground
	local groundFound = false
	local groundCheckHeights = { 0.0,50.0,100.0,150.0,200.0,250.0,300.0,350.0,400.0,450.0,500.0,550.0,600.0,650.0,700.0,750.0,800.0,850.0,900.0,950.0,1000.0,1050.0,1100.0 }
	for i,height in ipairs(groundCheckHeights) do
		SetEntityCoordsNoOffset(ped,x,y,height,0,0,1)
		RequestCollisionAtCoord(x,y,z)
		while not HasCollisionLoadedAroundEntity(ped) do
			RequestCollisionAtCoord(x,y,z)
			Citizen.Wait(1)
		end
		Citizen.Wait(20)
		ground,z = GetGroundZFor_3dCoord(x,y,height)
		if ground then
			z = z + 1.0
			groundFound = true
			break;
		end
	end
	if not groundFound then
		z = 1200
		GiveDelayedWeaponToPed(PlayerPedId(),0xFBAB5776,1,0)
	end
	RequestCollisionAtCoord(x,y,z)
	while not HasCollisionLoadedAroundEntity(ped) do
		RequestCollisionAtCoord(x,y,z)
		Citizen.Wait(1)
	end
	arc.Teleport2(PlayerPedId(),x,y,z)
    arc.sendNotify('success', 'Teletransportado com sucesso.')
end)

RegisterNUICallback("TpCds", function (cb)
    local coords = {}
    for coord in string.gmatch(cb.cds or "0,0,0","[^,]+") do
        table.insert(coords,tonumber(coord))
    end
    arc.Teleport(PlayerPedId(),coords[1],coords[2],coords[3])
    arc.sendNotify('success', 'Teletransportado com sucesso.')
end)

RegisterNUICallback("TpToMe", function(data)
    local playerId = tonumber(data.playerId)
    if playerId then
        local targetPed = GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(playerId)))
        if targetPed then
            local x, y, z = table.unpack(GetEntityCoords(PlayerPedId()))
            arc.Teleport(targetPed,x, y, z)
            arc.sendNotify('success', 'Jogador teletransportado ate voce.')
        else
            arc.sendNotify('error', 'Falha ao encontrar o jogador.')
        end
    end
end)

RegisterNUICallback("TpTo", function(data)
    local playerId = tonumber(data.playerId)
    if playerId then
        local targetPed = GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(playerId)))
        if targetPed then
            local x, y, z = table.unpack(GetEntityCoords(targetPed))
            arc.Teleport(PlayerPedId(),x, y, z)
            arc.sendNotify('success', 'Voce foi teletransportado para o jogador.')
        else
            arc.sendNotify('error', 'Falha ao encontrar o jogador.')
        end
    end
end)

-------------------

RegisterNUICallback("CopyVec", function(data)
    local type = data.type
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)

    if type == "vec2" then
        local vec2 = string.format("%.2f, %.2f", coords.x, coords.y)
        SendNUIMessage({ type = "copy", data = vec2 })
        arc.sendNotify('success', 'Vec2 copiado com sucesso.')
    elseif type == "vec3" then
        local vec3 = string.format("%.2f, %.2f, %.2f", coords.x, coords.y, coords.z)
        SendNUIMessage({ type = "copy", data = vec3 })
        arc.sendNotify('success', 'Vec3 copiado com sucesso.')
    elseif type == "vec4" then
        local vec4 = string.format("%.2f, %.2f, %.2f, %.2f", coords.x, coords.y, coords.z, heading)
        SendNUIMessage({ type = "copy", data = vec4 })
        arc.sendNotify('success', 'Vec4 copiado com sucesso.')
    elseif type == "heading" then
        local headingStr = string.format("%.2f", heading)
        SendNUIMessage({ type = "copy", data = headingStr })
        arc.sendNotify('success', 'Heading copiado com sucesso.')
    end
end)

-------------------

local function EnumerateEntities(initFunc, moveFunc, disposeFunc) return coroutine.wrap(function() local iter, id = initFunc() if not id or id == 0 then disposeFunc(iter) return end local enum = {handle = iter, destructor = disposeFunc} setmetatable(enum, entityEnumerator) local next = true repeat coroutine.yield(id) next, id = moveFunc(iter) until not next enum.destructor, enum.handle = nil, nil disposeFunc(iter) end) end
function EnumerateVehicles() return EnumerateEntities(FindFirstVehicle, FindNextVehicle, EndFindVehicle) end
function EnumerateObjects() return EnumerateEntities(FindFirstObject, FindNextObject, EndFindObject) end
function EnumeratePeds() return EnumerateEntities(FindFirstPed, FindNextPed, EndFindPed) end

local debugObj, debugVeh, debugPeds = false, false, false
RegisterNUICallback("Debug", function(data)
    local type = data.type
    local toggle = data.toggle

    if toggle then
        if type == "objects" then
            arc.sendNotify('success', 'Debug de objects ativado.')
            debugObj = true
        elseif type == "vehicles" then
            arc.sendNotify('success', 'Debug de vehicles ativado.')
            debugVeh = true
        elseif type == "peds" then
            arc.sendNotify('success', 'Debug de peds ativado.')
            debugPeds = true
        end
    else
        if type == "objects" then
            arc.sendNotify('success', 'Debug de objects desativado.')
            debugObj = false
        elseif type == "vehicles" then
            arc.sendNotify('success', 'Debug de vehicles desativado.')
            debugVeh = false
        elseif type == "peds" then
            arc.sendNotify('success', 'Debug de peds desativado.')
            debugPeds = false
        end
    end
end)

CreateThread(function()
    while true do
        local waitTime = 2000
        if debugObj then
            waitTime = 0
            for object in EnumerateObjects() do
                local x, y, z = table.unpack(GetEntityCoords(object))
                local playerCoords = GetEntityCoords(PlayerPedId())
                local distance = #(playerCoords - vector3(x, y, z))

                local model = GetEntityModel(object)

                if distance <= 30 then
                    
                    if propName[model] == nil then
                        for _, prop in ipairs(prop_list) do
                            if GetHashKey(prop) == model then
                                propName[model] = prop
                                break
                            end
                        end
                    end
    
                    local displayModel = propName[model] or tostring(model)

                    DrawText3D(x, y, z + 1.0, ("Object ID: %d\nModel: %s\nDistance: %.2f"):format(object, displayModel, distance))
                end
            end
        end
        Wait(waitTime)
    end
end)

CreateThread(function()
    while true do
        local waitTime = 2000
        if debugVeh then
            waitTime = 0
            for vehicle in EnumerateVehicles() do
                local x, y, z = table.unpack(GetEntityCoords(vehicle))
                local playerCoords = GetEntityCoords(PlayerPedId())
                local distance = #(playerCoords - vector3(x, y, z))

                if distance <= 30 then
                    local model = GetDisplayNameFromVehicleModel(GetEntityModel(vehicle))
                    local speed = GetEntitySpeed(vehicle) * 3.6
                    local health = GetEntityHealth(vehicle)
                    DrawText3D(x, y, z + 1.0, ("Vehicle ID: %d\nModel: %s\nSpeed: %.2f km/h\nHealth: %d\nDistance: %.2f"):format(vehicle, model, speed, health, distance))
                end
            end
        end
        Wait(waitTime)
    end
end)

CreateThread(function()
    while true do
        local waitTime = 2000
        if debugPeds then
            waitTime = 0
            for ped in EnumeratePeds() do
                local x, y, z = table.unpack(GetEntityCoords(ped))
                local playerCoords = GetEntityCoords(PlayerPedId())
                local distance = #(playerCoords - vector3(x, y, z))

                if distance <= 30 then
                    local model = GetEntityModel(ped)

                    for k,v in pairs(returnPedsList()) do
                        if model == GetHashKey(tostring(k)) then
                            model = k
                        end
                    end

                    local health = GetEntityHealth(ped)
                    local isPlayer = IsPedAPlayer(ped)
                    if isPlayer then
                        isPlayer = 'Yes'
                    end
                    DrawText3D(x, y, z + 1.0, ("Ped ID: %d\nModel: %s\nHealth: %d\nIs Player: %s\nDistance: %.2f"):format(ped, model, health, tostring(isPlayer), distance))
                end
            end
        end
        Wait(waitTime)
    end
end)

-------------------

RegisterNUICallback("Delete", function(data)
    local type = data.type
    local distance = tonumber(data.distance)
    if distance > 500 then
        arc.sendNotify('error', 'Impossivel deletar em uma distancia maior de 500')
        return
    end

    local deletedCount = 0

    if type == "objects" then
        for object in EnumerateObjects() do
            local x, y, z = table.unpack(GetEntityCoords(object))
            local playerCoords = GetEntityCoords(PlayerPedId())
            local dist = #(playerCoords - vector3(x, y, z))
            
            if dist <= distance then
                if DoesEntityExist(object) then
                    if NetworkDoesEntityExistWithNetworkId(ObjToNet(object)) then
                        SetNetworkIdCanMigrate(ObjToNet(object))
                        arcServer.SyncDelete(ObjToNet(object), 'obj')
                        deletedCount = deletedCount + 1
                    end
                end
            end
        end
        arc.sendNotify('success', ('Deletado %d objetos.'):format(deletedCount))

    elseif type == "vehicles" then
        for vehicle in EnumerateVehicles() do
            local x, y, z = table.unpack(GetEntityCoords(vehicle))
            local playerCoords = GetEntityCoords(PlayerPedId())
            local dist = #(playerCoords - vector3(x, y, z))

            if dist <= distance then
                arcServer.SyncDelete(VehToNet(vehicle), 'veh')
                deletedCount = deletedCount + 1
            end
        end
        arc.sendNotify('success', ('Deletado %d veiculos.'):format(deletedCount))

    elseif type == "peds" then
        for ped in EnumeratePeds() do
            if not IsPedAPlayer(ped) then
                local x, y, z = table.unpack(GetEntityCoords(ped))
                local playerCoords = GetEntityCoords(PlayerPedId())
                local dist = #(playerCoords - vector3(x, y, z))
    
                if dist <= distance then
                    arcServer.SyncDelete(PedToNet(ped), 'ped')
                    deletedCount = deletedCount + 1
                end
            end
        end
        arc.sendNotify('success', ('Deletado %d peds.'):format(deletedCount))
    end
end)

-------------------

local SuperJump = false
local SuperRun = false
local SuperSwim = false
local SuperStamina = false
local displayRadar = false
local Invisible = false
local Invincible = false
local InfAmmo = false
local HitKill = false

-- SuperJump
RegisterNUICallback("SuperJump", function(data)
    local toggle = data.toggle
    SuperJump = toggle
end)

-- SuperRun
RegisterNUICallback("SuperRun", function(data)
    local toggle = data.toggle
    SuperRun = toggle
end)

-- SuperSwim
RegisterNUICallback("SuperSwim", function(data)
    local toggle = data.toggle
    SuperSwim = toggle
end)

-- SuperStamina
RegisterNUICallback("SuperStamina", function(data)
    local toggle = data.toggle
    SuperStamina = toggle
end)

-- DisplayRadar
RegisterNUICallback("DisplayRadar", function(data)
    local toggle = data.toggle
    displayRadar = toggle
end)

-- Invisible
RegisterNUICallback("Invisible", function(data)
    local toggle = data.toggle
    Invisible = toggle
end)

-- Invincible
RegisterNUICallback("Invincible", function(data)
    local toggle = data.toggle
    Invincible = toggle
end)

-- InfAmmo
RegisterNUICallback("InfAmmo", function(data)
    local toggle = data.toggle
    InfAmmo = toggle
end)

-- HitKill
RegisterNUICallback("HitKill", function(data)
    local toggle = data.toggle
    HitKill = toggle
end)

-- SuperJump Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if SuperJump then
            arcano = 1
            SetSuperJumpThisFrame(PlayerId())
        end
        Wait(arcano)
    end
end)

-- SuperRun Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if SuperRun then
            arcano = 1
            if IsDisabledControlPressed(0, 21) or (IsControlPressed(0, 21) and not IsPedRagdoll(PlayerPedId())) then
                local x, y, z = GetOffsetFromEntityInWorldCoords(PlayerPedId(), 0.0, 30.0, GetEntityVelocity(PlayerPedId())[3]) - GetEntityCoords(PlayerPedId())
                SetEntityVelocity(PlayerPedId(), x, y, z)
            end
        end
        Wait(arcano)
    end
end)

-- SuperSwim Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if SuperSwim then
            arcano = 1
            SetSwimMultiplierForPlayer(PlayerId(), 1.49)
        end
        Wait(arcano)
    end
end)

-- SuperStamina Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if SuperStamina then
            arcano = 1
            SetPlayerStamina(PlayerId(), 100.0)  -- Pode ajustar conforme a necessidade
        end
        Wait(arcano)
    end
end)

-- DisplayRadar Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if displayRadar then
            arcano = 1
            DisplayRadar(true)
        end
        Wait(arcano)
    end
end)

-- Invisible Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if Invisible then
            arcano = 1
            SetEntityVisible(PlayerPedId(), false, false)
        else
            SetEntityVisible(PlayerPedId(), true, false)
        end
        Wait(arcano)
    end
end)

-- Invincible Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if Invincible then
            arcano = 1
            SetEntityInvincible(PlayerPedId(), true)
        else
            SetEntityInvincible(PlayerPedId(), false)
        end
        Wait(arcano)
    end
end)

-- InfAmmo Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if InfAmmo then
            arcano = 1
            if IsPedShooting(PlayerPedId()) then
                local __, weapon = GetCurrentPedWeapon(PlayerPedId())
                local ammo = GetAmmoInPedWeapon(PlayerPedId(), weapon)
                SetPedAmmo(PlayerPedId(), weapon, ammo + 1)
                PedSkipNextReloading(PlayerPedId())
                MakePedReload(PlayerPedId())
            end
        end
        Wait(arcano)
    end
end)

-- HitKill Thread
CreateThread(function()
    while true do
        local arcano = 2000
        if HitKill then
            arcano = 1
            SetWeaponDamageModifier(GetSelectedPedWeapon(PlayerPedId()), 1000.0)
        end
        Wait(arcano)
    end
end)

-------------------

RegisterNUICallback("Geral", function(data)
    local type = data.type

    if type == "announce" then
        local message = data.message
        arcServer.Announce(message)
    elseif type == 'revive' then
        arcServer.reviveGeral()
        arc.sendNotify('success', 'Todos jogadores foram revividos.')
    elseif type == 'kill' then
        arcServer.killGeral()
        arc.sendNotify('success', 'Todos jogadores foram mortos.')
    elseif type == 'kick' then
        arcServer.kickGeral()
    end
end)

-------------------

RegisterNUICallback("Spawn", function(data)
    local type = data.type
    local id = parseInt(data.spawnId)
    local index = data.index

    if not id then
        return
    end

    if type == "money" then
        local quantity = parseInt(data.quantity)
        if quantity then
            arcServer.spawnMoney(id, quantity)
            arc.sendNotify('success', '$'..quantity..' foi spawnado para o id '..id..'.')
        end
    elseif type == 'item' then
        local quantity = parseInt(data.quantity)
        if quantity then
            arcServer.spawnItem(id, index, quantity)
            arc.sendNotify('success', ''..quantity..' '..index..' foi spawnado para o id '..id..'.')
        end
    elseif type == 'vehicle' then
        arc.SpawnVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))), index)
        arc.sendNotify('success', ''..index..' foi spawnado para o id '..id..'.')
    elseif type == 'weapon' then
        arc.SpawnWeapon(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))), GetHashKey(index))
        arc.sendNotify('success', ''..index..' foi spawnada para o id '..id..'.')
    end
end)

RegisterNUICallback("RemoveMoney", function(data)
    local id = parseInt(data.playerId)
    local quantity = parseInt(data.quantity)
    if quantity then
        arcServer.removeMoney(id, quantity)
        arc.sendNotify('success', '$'..quantity..' foi removido do id '..id..'.')
    end
end)

RegisterNUICallback("RemoveItem", function(data)
    local id = parseInt(data.playerId)
    local index = data.index
    local quantity = parseInt(data.quantity)
    if quantity then
        arcServer.removeItem(id, index, quantity)
        arc.sendNotify('success', ''..quantity..'x '..index..' foi removido do id '..id..'.')
    end
end)

RegisterNUICallback("RemoveVehicle", function(data)
    local id = parseInt(data.playerId)
    local index = data.index
    arcServer.removeVehicle(id, index)
    arc.sendNotify('success', 'O veiculo '..index..' foi removido do id '..id..'.')
end)

RegisterNUICallback("AddVehicle", function(data)
    local id = parseInt(data.playerId)
    local index = data.index
    arcServer.addVehicle(id, index)
    arc.sendNotify('success', 'O veiculo '..index..' foi adicionado ao id '..id..'.')
end)

-------------------

RegisterNUICallback("maxVeh", function(data)
    local id = parseInt(data.id)
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    arc.maxVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))))
    arc.sendNotify('success', 'Veiculo do jogador "'..id..'" foi maximizado.')
end)

RegisterNUICallback("maxVehSpeed", function(data)
    local id = parseInt(data.id)
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    arc.maxVehicleSpeed(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))))
    arc.sendNotify('success', 'A velocidade do veiculo do jogador "'..id..'" foi maximizada.')
end)

RegisterNUICallback("fixVeh", function(data)
    local id = parseInt(data.id)
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    arc.fixVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))))
    arc.sendNotify('success', 'Veiculo do jogador "'..id..'" foi consertado.')
end)

RegisterNUICallback("breakVeh", function(data)
    local id = parseInt(data.id)
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    arc.breakVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))))
    arc.sendNotify('success', 'Veiculo do jogador "'..id..'" foi quebrado.')
end)

RegisterNUICallback("deleteVeh", function(data)
    local id = parseInt(data.id)
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    arcServer.SyncDelete(VehToNet(GetVehiclePedIsIn(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))))), 'veh')
    arc.sendNotify('success', 'Veiculo do jogador "'..id..'" foi deletado.')
end)

RegisterNUICallback("changeVehColor", function(data)
    local id = parseInt(data.id)
    local rgb = {}
    for color in string.gmatch(data.rgb or "0,0,0","[^,]+") do
        table.insert(rgb,tonumber(color))
    end
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    arc.changeVehicleColor(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id))), rgb[1], rgb[2], rgb[3])
    arc.sendNotify('success', 'Alterado a cor do veiculo do jogador "'..id..'" para "'..rgb[1]..', '..rgb[2]..', '..rgb[3]..'".')
end)

RegisterNUICallback("cleanVeh", function(data)
    local id = parseInt(data.id)
    if not id then
        return
    end

    if not IsPedInAnyVehicle(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))) then
        arc.sendNotify('error', 'O jogador nao esta em um veiculo.')
        return
    end
    SetVehicleDirtLevel(GetVehiclePedIsIn(GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(id)))), 0.0)
    arc.sendNotify('success', 'Veiculo do jogador "'..id..'" foi limpado.')
end)

RegisterNUICallback("joinVeh", function()
    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed)
    local vehicle = GetClosestVehicle(playerCoords.x, playerCoords.y, playerCoords.z, 5.0, 0, 70)

    if vehicle and vehicle ~= 0 then
        local vehicleModel = GetEntityModel(vehicle)
        local vehicleName = GetLabelText(GetDisplayNameFromVehicleModel(vehicleModel))
        local driverPed = GetPedInVehicleSeat(vehicle, -1)

        if driverPed and driverPed ~= 0 then
            TaskLeaveVehicle(driverPed, vehicle, 16)
            Wait(500)
        end

        TaskWarpPedIntoVehicle(playerPed, vehicle, -1)
        arc.sendNotify('success', 'Voce entrou no veiculo: ' .. vehicleName)
    else
        arc.sendNotify('error', 'Nenhum veiculo próximo foi encontrado.')
    end
end)


RegisterNUICallback("lockVeh", function()
    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed)
    local vehicle = GetClosestVehicle(playerCoords.x, playerCoords.y, playerCoords.z, 5.0, 0, 70)

    if vehicle and vehicle ~= 0 then
        local vehicleModel = GetEntityModel(vehicle)
        local vehicleName = GetLabelText(GetDisplayNameFromVehicleModel(vehicleModel))

        SetVehicleDoorsLocked(vehicle, 2)
        arc.sendNotify('success', 'O veiculo ' .. vehicleName .. ' foi trancado.')
    else
        arc.sendNotify('error', 'Nenhum veiculo próximo foi encontrado para trancar.')
    end
end)

RegisterNUICallback("unlockVeh", function()
    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed)
    local vehicle = GetClosestVehicle(playerCoords.x, playerCoords.y, playerCoords.z, 5.0, 0, 70)

    if vehicle and vehicle ~= 0 then
        local vehicleModel = GetEntityModel(vehicle)
        local vehicleName = GetLabelText(GetDisplayNameFromVehicleModel(vehicleModel))

        SetVehicleDoorsLocked(vehicle, 1)
        arc.sendNotify('success', 'O veiculo ' .. vehicleName .. ' foi destrancado.')
    else
        arc.sendNotify('error', 'Nenhum veiculo próximo foi encontrado para destrancar.')
    end
end)

-------------------

RegisterNUICallback("setWeather", function(data)
    local type = data.type
    local types = {
        ['sunny'] = 1,
        ['cloudy'] = 2,
        ['rainy'] = 3,
        ['stormy'] = 4,
        ['foggy'] = 5,
        ['snowy'] = 6,
        ['blizzard'] = 7
    }
    arcServer.defineWeather(types[type])
    arc.sendNotify('success', 'Tempo mudado para '..type..'.')
end)

RegisterNUICallback("setHour", function(data)
    local type = data.type
    arcServer.defineHour(type)
    arc.sendNotify('success', 'Horas ajustadas com sucesso.')
end)

-------------------

RegisterNUICallback("TazePlayer", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        local targetPed = GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(playerId)))
        if targetPed then
            local coords = GetEntityCoords(targetPed)
            RequestCollisionAtCoord(coords.x, coords.y, coords.z)
            ShootSingleBulletBetweenCoords(coords.x, coords.y, coords.z, coords.x, coords.y, coords.z + 2, 0, true, "WEAPON_STUNGUN", PlayerPedId(), false, false, 100)
            arc.sendNotify('success', 'Choque aplicado ao jogador "'..playerId..'".')
        else
            arc.sendNotify('error', 'Falha ao encontrar o jogador.')
        end
    end
end)

-------------------

RegisterNUICallback("RemoveWeapons", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        local targetPed = GetPlayerPed(GetPlayerFromServerId(arcServer.getPlayerSource(playerId)))
        if targetPed then
            RemoveAllPedWeapons(targetPed, true)
            arc.sendNotify('success', 'Armas do jogador "'..playerId..'" removidas.')
        else
            arc.sendNotify('error', 'Falha ao encontrar o jogador.')
        end
    end
end)

-------------------

RegisterNUICallback("RemoveWhitelist", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        arcServer.removeWhitelist(playerId)
        arc.sendNotify('success', 'Whitelist do jogador "'..playerId..'" removida.')
    end
end)

-------------------

RegisterNUICallback("ScreenShot", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        arcServer.screenshot('Screenshot requested', Config.WebHooks.Functions, arcServer.getPlayerSource(playerId))
        if arcServer.getPlayerSource(playerId) then
            arc.sendNotify('success', 'Screenshot do jogador enviada ao discord.')
        else
            arc.sendNotify('error', 'Jogador offline.')
        end
    end
end)

-------------------

RegisterNUICallback("Freeze", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        arcServer.FreezePlayer(arcServer.getPlayerSource(playerId))
        if data.toggle then
            arc.sendNotify('success', 'Jogador Congelado.')
        else
            arc.sendNotify('success', 'Jogador Descongelado.')
        end
    end
end)

function arc.FreezePlayer(toggle)
    FreezeEntityPosition(PlayerPedId(), toggle)
end

-------------------

RegisterNUICallback("Spectate", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        arcServer.Spectate(playerId)
    end
end)

function arc.SpectatePlayer(source)
    if not NetworkIsInSpectatorMode() then
        local nped = GetPlayerPed(GetPlayerFromServerId(source))
        NetworkSetInSpectatorMode(true, nped)
        arc.sendNotify('success', 'Entrou no modo Spectador.')
    else
        NetworkSetInSpectatorMode(false)
        arc.sendNotify('error', 'Saiu do modo Spectador.')
    end
end

-------------------

RegisterNUICallback("SendNotify", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        arcServer.SendPvNotify(playerId, data.content)
        arc.sendNotify('success', 'Mensagem enviada ao jogador.')
    end
end)

-------------------

RegisterNUICallback("Kick", function(data)
    local playerId = parseInt(data.playerId)
    local reason = data.reason
    if playerId then
        arcServer.Kick(arcServer.getPlayerSource(playerId), reason)
    end
end)

RegisterNUICallback("Ban", function(data)
    local playerId = parseInt(data.playerId)
    local reason = data.reason
    local cooldown = data.cooldown
    if playerId then
        arcServer.banPlayer(playerId, reason, cooldown, myId)
        arc.sendNotify('success', 'Jogador banido.')
    end
end)

RegisterNUICallback("Unban", function(data)
    local playerId = parseInt(data.playerId)
    if playerId then
        if arcServer.unbanPlayer(playerId) then
            arc.sendNotify('success', 'Jogador desbanido.')
        else
            arc.sendNotify('error', 'Jogador nao esta banido.')
        end
    end
end)

RegisterNUICallback("Arrest", function(data)
    local playerId = parseInt(data.playerId)
    local reason = data.reason
    local cooldown = data.cooldown
    if playerId then
        arcServer.arrestPlayer(playerId, reason, cooldown)
        arc.sendNotify('success', 'O jogador foi preso.')
    end
end)

-------------------

RegisterNUICallback("setGroup", function(data)
    local playerId = parseInt(data.playerId)
    local group = data.group
    local type = data.type
    local level = parseInt(data.confirmLevel)
    if playerId then
        if type == 'add' then
            if level then
                arcServer.addGroup(playerId, group, level)
            else
                arcServer.addGroup(playerId, group)
            end
            arc.sendNotify('success', '"'..group..'" setado ao id '..playerId..'')
        elseif type == 'rem' then
            arcServer.remGroup(playerId, group)
            arc.sendNotify('success', '"'..group..'" removido do id '..playerId..'')
        end

    end
end)

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------

local SuspectCount = {
    vehicle = {},
    weapon = {},
    prop = {}
}

local function HandleSuspect(entityType, model, PlayerID)
    if not SuspectCount[entityType][PlayerID] then
        SuspectCount[entityType][PlayerID] = 0
    end

    SuspectCount[entityType][PlayerID] = SuspectCount[entityType][PlayerID] + 1
    
    if SuspectCount[entityType][PlayerID] >= parseInt(Config['Suspect']['SuspectActions']['MaxSuspectCount']) then
        if Config['Suspect']['SuspectActions']['Kick'] and not Config['Suspect']['SuspectActions']['Ban'] then
            arcServer.Kick(arcServer.getPlayerSource(PlayerID), 'MaxSuspectCount. [' .. SuspectCount[entityType][PlayerID] .. ']')
        elseif Config['Suspect']['SuspectActions']['Ban'] then
            arcServer.banPlayer(PlayerID, 'MaxSuspectCount. [' .. SuspectCount[entityType][PlayerID] .. ']', 0)
        end
    end

    local labelEntityType = {
        ['vehicle'] = 'Veiculo suspeito spawnado',
        ['weapon'] = 'Arma suspeita spawnada',
        ['prop'] = 'Prop suspeito spawnado'
    }
    addSuspect(labelEntityType[entityType]..'. '..SuspectCount[entityType][PlayerID]..'x\nModelo: ' .. model .. '.', model, PlayerID, entityType)
    arc.sendNotify('error', labelEntityType[entityType]..'. '..SuspectCount[entityType][PlayerID]..'x\nModelo: ' .. model .. '.', 'realTime', false, true)
end

local suspectModelHashes = {}
for _, model in pairs(Config['Suspect']['Objects']) do
    local modelHash = GetHashKey(model)
    suspectModelHashes[modelHash] = model
end

CreateThread(function()
    while true do
        local arcano = 5000
        for obj in EnumerateObjects() do
            if DoesEntityExist(obj) and NetworkGetEntityIsNetworked(obj) then
                local model = GetEntityModel(obj)
                local suspectName = suspectModelHashes[model]
                if suspectName then
                    local PlayerID = GetPlayerServerId(NetworkGetEntityOwner(obj))
                    if PlayerID ~= 0 then
                        arcServer.SyncDelete(ObjToNet(obj), 'obj')
                        HandleSuspect('prop', suspectName, PlayerID)
                    end
                end
            end
        end

        Wait(arcano)
    end
end)

CreateThread(function()
    while true do
        local arcano = 2000
        for veh in EnumerateVehicles() do
            local model = GetEntityModel(veh)
            for _, suspectModel in pairs(Config['Suspect']['Vehicles']) do
                if model == GetHashKey(suspectModel) then
                    local PlayerID = GetPlayerServerId(NetworkGetEntityOwner(veh))
                    arcServer.SyncDelete(VehToNet(veh), 'veh')
                    HandleSuspect('vehicle', suspectModel, PlayerID)
                end
            end
        end
        for _, weaponName in pairs(Config['Suspect']['Weapons']) do
            local weaponHash = GetHashKey(weaponName)
            if HasPedGotWeapon(PlayerPedId(), weaponHash, false) then
                RemoveAllPedWeapons(PlayerPedId(), true)
                local PlayerID = GetPlayerServerId(PlayerId())
                HandleSuspect('weapon', weaponName, PlayerID)
            end
        end
        Wait(arcano)
    end
end)