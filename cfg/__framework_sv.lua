local shared = module(GetCurrentResourceName(), "shared/shared")
Tunnel = shared.Tunnel
Proxy = shared.Proxy

arc = {}
Tunnel.bindInterface(GetCurrentResourceName(), arc)
arcClient = Tunnel.getInterface(GetCurrentResourceName())

Config = json.decode(LoadResourceFile(GetCurrentResourceName(), 'cfg/cfg.json'))

oxmysql = exports.oxmysql

local CurrentFrameWork
FW_sv = nil
FW_cl = nil

function arc.returnFrameWork()
    return CurrentFrameWork
end

----------------------------------------------------------------------------------------------------------------------------------------

if GetResourceState('vrp') == 'started' then
    CurrentFrameWork = 'vrp'
    FW_cl = Tunnel.getInterface("vRP")
    FW_sv = Proxy.getInterface("vRP")
    if FW_sv.Inventory() then
        CurrentFrameWork = 'creative'
    end
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.executeSync(query, table)
    return oxmysql:executeSync(query, table)
end

local FrameWorkFunctions = {
    ['creative'] = {
        ['returnWhitelistedPlayersId'] = function()
            local query = [[
                SELECT id
                FROM accounts WHERE whitelist = 1
            ]]
            local result = oxmysql:executeSync(query, {})
            local whitelistedPlayers = {}
            if result and #result > 0 then
                for i = 1, #result do
                    table.insert(whitelistedPlayers, result[i].id)
                end
            end
            return whitelistedPlayers
        end,

        ['removeWhitelist'] = function(id)
            FW_sv.Query("accounts/updateWhitelist",{ id = id, whitelist = 0 })
        end,

        ['returnPlayerId'] = function(s)
            s = s or source
            local user_id = FW_sv.Passport(s)
            return user_id
        end,

        ['returnGroups'] = function()
            local groups = {}
            for k,v in pairs(FW_sv.Groups()) do
                if not groups[k] then
                    local groupType = v.Type == "Work" and 'legal' or 'staff'
                    groups[k] = {
                        set = k,
                        level = #v.Hierarchy,
                        type = groupType
                    }
                end
            end
            return groups
        end,

        ['addGroup'] = function(id, group, level)
            FW_sv.SetPermission(id, group, level)
        end,
        
        ['remGroup'] = function(id, group)
            FW_sv.RemovePermission(id, group)
        end,

        ['returnPlayerInventory'] = function(id)
            local inventory = {}
            local player_inv = FW_sv.Inventory(id)
            if player_inv then
                for k,v in pairs(player_inv) do
                    if not inventory[itemName(v["item"])] then
                        inventory[itemName(v["item"])]= {
                            index = itemIndex(v["item"]),
                            image = itemIndex(v["item"]),
                            quantity = v.amount
                        }
                    end
                end
            end
            return inventory
        end,

        ['returnInventoryList'] = function()
            local inventory = {}
            local inv_list = itemList()
            if inv_list then
                for k,v in pairs(inv_list) do
                    if not inventory[v.Index] then
                        inventory[v.Index] = {
                            name = v.Name,
                            image = v.Index,
                        }
                    end
                end
            end
            return inventory
        end,

        ['returnPlayerVehicles'] = function(id)
            local vehicles = {}
            local query = [[
                SELECT vehicle
                FROM vehicles WHERE Passport = ?
            ]]
            local result = oxmysql:executeSync(query, {id})
            if result then
                for k,v in pairs(result) do
                    for _,vehicle in pairs(v) do
                        if not vehicles[vehicle] then
                            vehicles[vehicle] = {index = vehicle}
                        end
                    end
                end
            end
            return vehicles
        end,

        ['returnPlayerFullName'] = function(id)
            local userIdentity = FW_sv.Identity(id)
            if not userIdentity then
                return "Desconhecido"
            end
            return userIdentity["name"].." "..userIdentity["name2"]
        end,

        ['returnPlayerPos'] = function(id)
            if FW_sv.getUserSource(id) then
                return arcClient.returnPlayerPos(FW_sv.getUserSource(id))
            end
            return {x = 0, y = 0, z = 0}
        end,

        ['returnPlayerHealth'] = function(id)
            if FW_sv.getUserSource(id) then
                return arcClient.returnPlayerHealth(FW_sv.getUserSource(id))
            end
            return 0
        end,

        ['returnPlayerArmour'] = function(id)
            if FW_sv.getUserSource(id) then
                return arcClient.returnPlayerArmour(FW_sv.getUserSource(id))
            end
            return 0
        end,

        ['returnPlayerPhone'] = function(id)
            local identity = FW_sv.Identity(id)
            if identity and identity["phone"] then
                return identity["phone"]
            end
            return nil
        end,

        ['returnPlayerWallet'] = function(id)
            local wallet = FW_sv.ItemAmount(id,'dollars')
            if wallet then
                return wallet
            end
            return 0
        end,

        ['returnPlayerBank'] = function(id)
            local identity = FW_sv.Identity(id)
            if identity and identity["bank"] then
                return identity["bank"]
            end
            return 0
        end,

        ['returnPlayerRoleName'] = function(id)
            local groupName = nil
            for k,v in pairs(FW_sv.Groups()) do
                if FW_sv.HasService(id, k) then
                    local groupType = v.Type == "Work" and 'legal' or 'staff'
                    groupName = k
                end
            end
            return groupName
        end,

        ['returnAdminRoleName'] = function(id)
            for k,v in pairs(FW_sv.Groups()) do
                if k == "Admin" or k == "Dono" then
                    for i = 1, #v.Hierarchy do
                        if FW_sv.HasGroup(id, "Admin", i) then
                            return v.Hierarchy[i]
                        end
                    end
                end
            end
            return nil
        end,

        ['spawnMoney'] = function(id,quantity)
            FW_sv.GenerateItem(id,"dollars",quantity,true)
        end,

        ['removeMoney'] = function(id,quantity)
            FW_sv.TakeItem(id, 'dinheiro', quantity)
        end,

        ['spawnItem'] = function(id,index,quantity)
            FW_sv.GenerateItem(id, index, quantity, true)
        end,

        ['removeItem'] = function(id,index,quantity)
            FW_sv.TakeItem(id, index, quantity)
        end,
        
        ['removeVehicle'] = function(id,vehicleIndex)
            FW_sv.Query("vehicles/removeVehicles",{ Passport = id, vehicle = vehicleIndex})
        end,
                
        ['addVehicle'] = function(id,vehicleIndex)
            FW_sv.Query("vehicles/addVehicles",{ Passport = id, vehicle = vehicleIndex, plate = FW_sv.GeneratePlate(), work = tostring(false) })
        end,

        ['arrestPlayer'] = function(playerId, reason, cooldown)
            --PRENDER JOGADOR
        end,

        ['spawnVehicle'] = function(vehicleName, x,y,z, h)
            local source = source

			local Plate = "VEH"..(10000 + arc.returnPlayerId(source))
			local Exist,Network,Vehicle = Creative.ServerVehicle(vehicleName,x,y,z, h,Plate,2000,nil,1000)

            if not Exist then
				return
			end

			vCLIENT.CreateVehicle(-1,vehicleName,Network,1000,1000,nil,false,false)
			TriggerEvent("engine:tryFuel",Plate,100)
			SetPedIntoVehicle(GetPlayerPed(source),Vehicle,-1)

            GlobalState["Plates"] = {}
			local Plates = GlobalState["Plates"]
			Plates[Plate] = arc.returnPlayerId(source)
			GlobalState:set("Plates",Plates,true)

        end,
    },
    ['vrp'] = {
        ['returnWhitelistedPlayersId'] = function()
            local query = [[
                SELECT id
                FROM vrp_users WHERE whitelisted = 1 AND banned = 0
            ]]
            local result = oxmysql:executeSync(query, {})
            local whitelistedPlayers = {}
            if result and #result > 0 then
                for i = 1, #result do
                    table.insert(whitelistedPlayers, result[i].id)
                end
            end
            return whitelistedPlayers
        end,

        ['removeWhitelist'] = function(id)
            FW_sv.setWhitelisted(id, false)
        end,

        ['returnPlayerId'] = function(s)
            s = s or source
            local user_id = FW_sv.getUserId(s)
            return user_id
        end,

        ['returnGroups'] = function()
            local groups = {}
            groups = {
                ["CEO"] = {set = 'ceo', type = 'staff'},
                ["ADM"] = {set = 'adm', type = 'staff'},
                ['MOD'] = {set = 'mod', type = 'staff'},
                ['SUP'] = {set = 'sup', type = 'staff'},

                ['Policia'] = {set = 'police', type = 'legal'},
                ['Médico'] = {set = 'ems', type = 'legal'},
                ['Mecânico'] = {set = 'mech', type = 'legal'},

                ['Ballas'] = {set = 'ballas', type = 'ilegal'},
                ['Vagos'] = {set = 'vagos', type = 'ilegal'},
                ['Groove'] = {set = 'grove', type = 'ilegal'},
                ['Crips'] = {set = 'crips', type = 'ilegal'},
                ['Bloods'] = {set = 'bloods', type = 'ilegal'},
                ['Máfia Egípcia'] = {set = 'megipcia', type = 'ilegal'},
                ['Triade'] = {set = 'triade', type = 'ilegal'},
                ['Yardie'] = {set = 'yardie', type = 'ilegal'},
                ['Mafia Russakaya'] = {set = 'mrussakaya', type = 'ilegal'},
                ['Bahamas'] = {set = 'bahamas', type = 'ilegal'},
                ['Life Invader'] = {set = 'lifeinvader', type = 'ilegal'},
                ['DriftKing'] = {set = 'desmanche', type = 'ilegal'},
                ['Galaxy'] = {set = 'galaxy', type = 'ilegal'},
            }
            return groups
        end,

        ['addGroup'] = function(id, group)
            FW_sv.addUserGroup(id,group)
        end,
        
        ['remGroup'] = function(id, group)
            FW_sv.removeUserGroup(id,group)
        end,

        ['returnPlayerInventory'] = function(id)
            local inventory = {}
            local player_inv = FW_sv.getInventory(id)
            if player_inv then
                for k,v in pairs(player_inv) do
                    if not inventory[FW_sv.itemNameList(k)] then
                        inventory[FW_sv.itemNameList(k)]= {
                            index = k,
                            image = k,
                            quantity = FW_sv.getInventoryItemAmount(id,k)
                        }
                    end
                end
            end
            return inventory
        end,

        ['returnInventoryList'] = function()
            local inventory = {}
            local inv_list = FW_sv.returnItemList()
            if inv_list then
                for k,v in pairs(inv_list) do
                    if not inventory[k] then
                        inventory[k] = {
                            name = v.nome,
                            image = k,
                        }
                    end
                end
            end
            return inventory
        end,

        ['returnPlayerVehicles'] = function(id)
            local vehicles = {}
            local query = [[
                SELECT vehicle
                FROM vrp_user_vehicles WHERE user_id = ?
            ]]
            local result = oxmysql:executeSync(query, {id})
            if result then
                for k,v in pairs(result) do
                    for _,vehicle in pairs(v) do
                        if not vehicles[vehicle] then
                            vehicles[vehicle] = {index = vehicle}
                        end
                    end
                end
            end
            return vehicles
        end,

        ['returnPlayerFullName'] = function(id)
            local userIdentity = FW_sv.getUserIdentity(id)
            if not userIdentity then
                return "Desconhecido"
            end
            return userIdentity.name..' '..userIdentity.firstname
        end,

        ['returnPlayerPos'] = function(id)
            if FW_sv.getUserSource(id) then
                return arcClient.returnPlayerPos(FW_sv.getUserSource(id))
            end
            return {x = 0, y = 0, z = 0}
        end,

        ['returnPlayerHealth'] = function(id)
            if FW_sv.getUserSource(id) then
                return arcClient.returnPlayerHealth(FW_sv.getUserSource(id))
            end
            return 0
        end,

        ['returnPlayerArmour'] = function(id)
            if FW_sv.getUserSource(id) then
                return arcClient.returnPlayerArmour(FW_sv.getUserSource(id))
            end
            return 0
        end,
        
        ['returnPlayerPhone'] = function(id)
            local identity = FW_sv.getUserIdentity(id)
            if identity and identity.phone then
                return identity.phone
            end
            return nil
        end,

        ['returnPlayerWallet'] = function(id)
            local wallet = FW_sv.getInventoryItemAmount(id,'dinheiro')
            if wallet then
                return wallet
            end
            return 0
        end,

        ['returnPlayerBank'] = function(id)
            local bank = FW_sv.getBankMoney(id)
            if bank then
                return bank
            end
            return 0
        end,

        ['returnPlayerRoleName'] = function(id)
            local user_groups = FW_sv.getUserGroups(id)
            local groupName = nil
            for k,v in pairs(user_groups) do
                if FW_sv.getGroupType(k) ~= 'staff' then
                    groupName = FW_sv.getGroupTitle(k)
                end
            end
            return groupName
        end,

        ['returnAdminRoleName'] = function(id)
            return FW_sv.getUserGroupByType(id,'staff')
        end,

        ['spawnMoney'] = function(id,quantity)
            FW_sv.giveInventoryItem(id, 'dinheiro', quantity)
        end,

        ['removeMoney'] = function(id,quantity)
            FW_sv.tryGetInventoryItem(id, 'dinheiro', quantity)
        end,

        ['spawnItem'] = function(id,index,quantity)
            FW_sv.giveInventoryItem(id, index, quantity)
        end,

        ['removeItem'] = function(id,index,quantity)
            FW_sv.tryGetInventoryItem(id, index, quantity)
        end,
        
        ['removeVehicle'] = function(id,vehicleIndex)
            --REMOVER VEÍCULO
        end,
                
        ['addVehicle'] = function(id,vehicleIndex)
            --ADICIONAR VEÍCULO
        end,

        ['arrestPlayer'] = function(playerId, reason, cooldown)
            --PRENDER JOGADOR
        end,
    }
}

----------------------------------------------------------------------------------------------------------------------------------------

if CurrentFrameWork then
    print('^2Framework Detectado: ^3'..CurrentFrameWork..'^7')
    for name, func in pairs(FrameWorkFunctions[CurrentFrameWork]) do
        arc[name] = func
    end
else
    print('^1Nenhum Framework Detectado. Impossível inicializar script.^7')
    return
end