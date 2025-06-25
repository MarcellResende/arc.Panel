local shared = module(GetCurrentResourceName(), "shared/shared")
Tunnel = shared.Tunnel
Proxy = shared.Proxy

arc = {}
Tunnel.bindInterface(GetCurrentResourceName(),arc)
arcServer = Tunnel.getInterface(GetCurrentResourceName())

Config = json.decode(LoadResourceFile(GetCurrentResourceName(), 'cfg/cfg.json'))

----------------------------------------------------------------------------------------------------------------------------------------

function DrawText3D(x,y,z, text)
    local onScreen,_x,_y=World3dToScreen2d(x,y,z)
    if onScreen then
        SetTextFont(4)
        SetTextScale(0.0, 0.30)
        SetTextEntry("STRING")
		SetTextOutline()
        SetTextCentre(1)
        AddTextComponentString(text)
        DrawText(_x,_y)
    end
end

----------------------------------------------------------------------------------------------------------------------------------------

function arc.returnPlayerPos()
    local x, y, z = table.unpack(GetEntityCoords(PlayerPedId()))
    return {
        x = tonumber(string.format("%.2f", x)),
        y = tonumber(string.format("%.2f", y)),
        z = tonumber(string.format("%.2f", z))
    }
end

function arc.returnPlayerHealth()
    return GetEntityHealth(PlayerPedId())
end

function arc.returnPlayerArmour()
    return GetPedArmour(PlayerPedId())
end

function arc.Teleport(player, x,y,z)
    if not player then
        player = PlayerPedId()
    end
    return SetEntityCoords(player, x,y,z)
end

function arc.Teleport2(player, x,y,z)
    return SetEntityCoordsNoOffset(player, x,y,z,0,0,1)
end

function arc.ChangeSkin(skinName)
    while not HasModelLoaded(GetHashKey(skinName)) do
        RequestModel(GetHashKey(skinName))
        Citizen.Wait(0)
    end

    if HasModelLoaded(GetHashKey(skinName)) then
        SetPlayerModel(PlayerId(),GetHashKey(skinName))
        SetModelAsNoLongerNeeded(GetHashKey(skinName))
        arc.sendNotify('success', 'Skin "'..skinName..'" definida com sucesso.')
    end
end

function arc.Revive(player)
    if not player then player = PlayerPedId() end
	local x,y,z = table.unpack(GetEntityCoords(player))
	NetworkResurrectLocalPlayer(x,y,z,true,true,false)
	ClearPedBloodDamage(player)
	SetEntityInvincible(player,false)
	SetEntityHealth(player,GetPedMaxHealth(player))
	ClearPedTasks(player)
	ClearPedSecondaryTask(player)
end

function arc.Armour(player)
    if not player then player = PlayerPedId() end
    AddArmourToPed(player, 200)
end

function arc.Kill(player)
    if not player then player = PlayerPedId() end
    SetEntityHealth(player, 0)
end

function arc.SpawnVehicle(player, vehicleName)
    if not player then player = PlayerPedId() end

    if arcServer.returnFrameWork() == 'creative' then
        local x,y,z = table.unpack(GetEntityCoords(player))
        arcServer.spawnVehicle(vehicleName, x,y,z, GetEntityHeading(player))
        return
    end

	while not HasModelLoaded(GetHashKey(vehicleName)) do
		RequestModel(GetHashKey(vehicleName))
		Citizen.Wait(10)
	end
	if HasModelLoaded(GetHashKey(vehicleName)) then
		local nveh = CreateVehicle(GetHashKey(vehicleName),GetEntityCoords(player),GetEntityHeading(player),true,false)
		NetworkRegisterEntityAsNetworked(nveh)
		while not NetworkGetEntityIsNetworked(nveh) do
			NetworkRegisterEntityAsNetworked(nveh)
			Citizen.Wait(1)
		end
		SetVehicleOnGroundProperly(nveh)
		SetVehicleAsNoLongerNeeded(nveh)
		SetVehicleIsStolen(nveh,false)
		SetPedIntoVehicle(player,nveh,-1)
		SetVehicleNeedsToBeHotwired(nveh,false)
		SetEntityInvincible(nveh,false)
		SetVehicleNumberPlateText(nveh,'Arc Panel')
		SetEntityAsMissionEntity(nveh,true,true)
		SetVehicleHasBeenOwnedByPlayer(nveh,true)
		SetVehRadioStation(nveh,"OFF")
		SetModelAsNoLongerNeeded(GetHashKey(vehicleName))
	end
end

function arc.maxVehicle(player)
    local vehicle = GetVehiclePedIsIn(player)
	if IsEntityAVehicle(vehicle) then
		SetVehicleModKit(vehicle,0)
		SetVehicleMod(vehicle,0,GetNumVehicleMods(vehicle,0)-1,false)
		SetVehicleMod(vehicle,1,GetNumVehicleMods(vehicle,1)-1,false)
		SetVehicleMod(vehicle,2,GetNumVehicleMods(vehicle,2)-1,false)
		SetVehicleMod(vehicle,3,GetNumVehicleMods(vehicle,3)-1,false)
		SetVehicleMod(vehicle,4,GetNumVehicleMods(vehicle,4)-1,false)
		SetVehicleMod(vehicle,5,GetNumVehicleMods(vehicle,5)-1,false)
		SetVehicleMod(vehicle,6,GetNumVehicleMods(vehicle,6)-1,false)
		SetVehicleMod(vehicle,7,GetNumVehicleMods(vehicle,7)-1,false)
		SetVehicleMod(vehicle,8,GetNumVehicleMods(vehicle,8)-1,false)
		SetVehicleMod(vehicle,9,GetNumVehicleMods(vehicle,9)-1,false)
		SetVehicleMod(vehicle,10,GetNumVehicleMods(vehicle,10)-1,false)
		SetVehicleMod(vehicle,11,GetNumVehicleMods(vehicle,11)-1,false)
		SetVehicleMod(vehicle,12,GetNumVehicleMods(vehicle,12)-1,false)
		SetVehicleMod(vehicle,13,GetNumVehicleMods(vehicle,13)-1,false)
		SetVehicleMod(vehicle,14,16,false)
		SetVehicleMod(vehicle,15,GetNumVehicleMods(vehicle,15)-2,false)
		SetVehicleMod(vehicle,16,GetNumVehicleMods(vehicle,16)-1,false)
		ToggleVehicleMod(vehicle,17,true)
		ToggleVehicleMod(vehicle,18,true)
		ToggleVehicleMod(vehicle,19,true)
		ToggleVehicleMod(vehicle,20,true)
		ToggleVehicleMod(vehicle,21,true)
		ToggleVehicleMod(vehicle,22,true)
		SetVehicleMod(vehicle,24,1,false)
		SetVehicleMod(vehicle,25,GetNumVehicleMods(vehicle,25)-1,false)
		SetVehicleMod(vehicle,27,GetNumVehicleMods(vehicle,27)-1,false)
		SetVehicleMod(vehicle,28,GetNumVehicleMods(vehicle,28)-1,false)
		SetVehicleMod(vehicle,30,GetNumVehicleMods(vehicle,30)-1,false)
		SetVehicleMod(vehicle,34,GetNumVehicleMods(vehicle,34)-1,false)
		SetVehicleMod(vehicle,35,GetNumVehicleMods(vehicle,35)-1,false)
		SetVehicleMod(vehicle,38,GetNumVehicleMods(vehicle,38)-1,true)
        SetVehicleWindowTint(vehicle,1)
        SetVehicleNumberPlateTextIndex(vehicle,5)
	end
end

function arc.maxVehicleSpeed(player)
    local vehicle = GetVehiclePedIsIn(player)
    SetVehicleEnginePowerMultiplier(vehicle, 200.0)
    SetVehicleEngineTorqueMultiplier(vehicle, 200.0)
end

function arc.fixVehicle(player)
    local vehicle = GetVehiclePedIsIn(player)
    SetVehicleFixed(vehicle)
    SetVehicleUndriveable(vehicle,false)
    SetEntityAsMissionEntity(vehicle,true,true)
    SetVehicleOnGroundProperly(vehicle)
end

function arc.breakVehicle(player)
    local vehicle = GetVehiclePedIsIn(player)
    SetVehicleEngineHealth(vehicle, 0.0)
    SetVehicleBodyHealth(vehicle, 0.0)
    SetVehicleUndriveable(vehicle,true)
end

function arc.changeVehicleColor(player, r,g,b)
    local vehicle = GetVehiclePedIsIn(player)
    SetVehicleCustomPrimaryColour(vehicle,r,g,b)
end

function arc.SpawnWeapon(player, weaponHash)
    if not player then player = PlayerPedId() end
    GiveWeaponToPed(player, weaponHash, 250, false, true)
end

function arc.defineWeather(type)
    local weatherTypes = {
        [1] = {name = "EXTRASUNNY", rainLevel = 0.0},
        [2] = {name = "CLOUDS", rainLevel = 0.0},
        [3] = {name = "RAIN", rainLevel = 10.0},
        [4] = {name = "THUNDER", rainLevel = 5.0},
        [5] = {name = "FOGGY", rainLevel = 0.0},
        [6] = {name = "XMAS", rainLevel = 0.0},
        [7] = {name = "BLIZZARD", rainLevel = 0.0}
    }
    local selectedWeather = weatherTypes[type]
    if selectedWeather then
        ClearOverrideWeather()
        ClearWeatherTypePersist()
        SetWeatherTypeNow(selectedWeather.name)
        SetOverrideWeather(selectedWeather.name)
        SetWeatherTypeNowPersist(selectedWeather.name)
        SetRainLevel(selectedWeather.rainLevel)
    end
end

function arc.defineHour(type)
    local hourTypes = {
        [1] = 0,
        [2] = 3,
        [3] = 6,
        [4] = 9,
        [5] = 12,
        [6] = 15,
        [7] = 18,
        [8] = 21
    }
    local selectedHour = hourTypes[type]
    if selectedHour ~= nil then
        SetClockTime(selectedHour, 0, 0)
        NetworkOverrideClockTime(selectedHour, 0, 0)
    end
end
----------------------------------------------------------------------------------------------------------------------------------------