local WeapList = {
    ['Corpo a corpo'] = {
        ['weapon_dagger'] = 'Adaga',
        ['weapon_bat'] = 'Taco de Baseball',
        ['weapon_bottle'] = 'Garrafa Quebrada',
        ['weapon_crowbar'] = 'Pé de Cabra',
        ['weapon_flashlight'] = 'Lanterna',
        ['weapon_golfclub'] = 'Taco de Golfe',
        ['weapon_hammer'] = 'Martelo',
        ['weapon_hatchet'] = 'Machado',
        ['weapon_knuckle'] = 'Soco Inglês',
        ['weapon_knife'] = 'Faca',
        ['weapon_machete'] = 'Facão',
        ['weapon_switchblade'] = 'Canivete',
        ['weapon_nightstick'] = 'Cassetete',
        ['weapon_wrench'] = 'Chave Inglesa',
        ['weapon_battleaxe'] = 'Machado de Batalha',
        ['weapon_poolcue'] = 'Taco de Sinuca',
        ['weapon_stone_hatchet'] = 'Machado de Pedra'
    },
    ['Pistolas'] = {
        ['weapon_pistol'] = 'Pistola',
        ['weapon_pistol_mk2'] = 'Pistola MK2',
        ['weapon_combatpistol'] = 'Pistola de Combate',
        ['weapon_appistol'] = 'Pistola Automática',
        ['weapon_stungun'] = 'Taser',
        ['weapon_pistol50'] = 'Pistola .50',
        ['weapon_snspistol'] = 'Pistola SNS',
        ['weapon_heavypistol'] = 'Pistola Pesada',
        ['weapon_vintagepistol'] = 'Pistola Vintage',
        ['weapon_flaregun'] = 'Sinalizador',
        ['weapon_marksmanpistol'] = 'Pistola de Precisão',
        ['weapon_revolver'] = 'Revolver Pesado',
        ['weapon_revolver_mk2'] = 'Revolver Pesado Mk II',
        ['weapon_doubleaction'] = 'Revolver de Dupla Ação',
        ['weapon_raypistol'] = 'Pistola de Raio',
        ['weapon_ceramicpistol'] = 'Pistola de Cerâmica',
        ['weapon_navyrevolver'] = 'Revolver Naval',
        ['weapon_gadgetpistol'] = 'Pistola Perfuradora',
        ['weapon_militaryrifle'] = 'Rifle Militar'
    },
    ['Submetralhadoras'] = {
        ['weapon_microsmg'] = 'Micro SMG',
        ['weapon_smg'] = 'SMG',
        ['weapon_smg_mk2'] = 'SMG Mk II',
        ['weapon_assaultsmg'] = 'SMG de Assalto',
        ['weapon_combatpdw'] = 'PDW de Combate',
        ['weapon_machinepistol'] = 'Pistola-Metralhadora',
        ['weapon_minismg'] = 'Mini SMG',
        ['weapon_raycarbine'] = 'Carabina de Raio'
    },
    ['Espingardas'] = {
        ['weapon_pumpshotgun'] = 'Escopeta de Cano Curto',
        ['weapon_pumpshotgun_mk2'] = 'Escopeta de Cano Curto Mk II',
        ['weapon_sawnoffshotgun'] = 'Escopeta Serrada',
        ['weapon_assaultshotgun'] = 'Escopeta de Assalto',
        ['weapon_bullpupshotgun'] = 'Escopeta Bullpup',
        ['weapon_musket'] = 'Mosquete',
        ['weapon_heavyshotgun'] = 'Escopeta Pesada',
        ['weapon_dbshotgun'] = 'Escopeta de Cano Duplo',
        ['weapon_autoshotgun'] = 'Escopeta Automática'
    },
    ['Fuzis de assalto'] = {
        ['weapon_assaultrifle'] = 'Rifle de Assalto',
        ['weapon_assaultrifle_mk2'] = 'Rifle de Assalto Mk II',
        ['weapon_carbinerifle'] = 'Carabina',
        ['weapon_carbinerifle_mk2'] = 'Carabina Mk II',
        ['weapon_advancedrifle'] = 'Rifle Avançado',
        ['weapon_specialcarbine'] = 'Carabina Especial',
        ['weapon_specialcarbine_mk2'] = 'Carabina Especial Mk II',
        ['weapon_bullpuprifle'] = 'Rifle Bullpup',
        ['weapon_bullpuprifle_mk2'] = 'Rifle Bullpup Mk II',
        ['weapon_compactrifle'] = 'Rifle Compacto',
        ['weapon_militaryrifle'] = 'Rifle Militar',
        ['weapon_heavyrifle'] = 'Rifle Pesado',
        ['weapon_tacticalrifle'] = 'Rifle Tático'
    },
    ['Rifles de precisão'] = {
        ['weapon_sniperrifle'] = 'Rifle de Precisão',
        ['weapon_heavysniper'] = 'Sniper Pesado',
        ['weapon_heavysniper_mk2'] = 'Sniper Pesado Mk II',
        ['weapon_marksmanrifle'] = 'Rifle de Atirador',
        ['weapon_marksmanrifle_mk2'] = 'Rifle de Atirador Mk II'
    },
    ['Armas Pesadas'] = {
        ['weapon_rpg'] = 'RPG',
        ['weapon_grenadelauncher'] = 'Lança-Granadas',
        ['weapon_minigun'] = 'Minigun',
        ['weapon_firework'] = 'Lança Fogos de Artifício',
        ['weapon_railgun'] = 'Railgun',
        ['weapon_hominglauncher'] = 'Lança-Mísseis Teleguiado',
        ['weapon_compactlauncher'] = 'Lança-Granadas Compacto',
        ['weapon_rayminigun'] = 'Minigun de Raio'
    },
    ['Arremessáveis'] = {
        ['weapon_grenade'] = 'Granada',
        ['weapon_bzgas'] = 'Gás BZ',
        ['weapon_molotov'] = 'Coquetel Molotov',
        ['weapon_stickybomb'] = 'Bomba Adesiva',
        ['weapon_proxmine'] = 'Mina de Proximidade',
        ['weapon_snowball'] = 'Bola de Neve',
        ['weapon_pipebomb'] = 'Bomba Caseira',
        ['weapon_ball'] = 'Bola',
        ['weapon_smokegrenade'] = 'Granada de Fumaça',
        ['weapon_flare'] = 'Sinalizador'
    },
    ['Diversos'] = {
        ['weapon_petrolcan'] = 'Galão de Gasolina',
        ['gadget_parachute'] = 'Paraquedas',
        ['weapon_fireextinguisher'] = 'Extintor de Incêndio',
        ['weapon_hazardcan'] = 'Galão de Produto Perigoso',
    }
}

function returnWeapList()
    return WeapList
end