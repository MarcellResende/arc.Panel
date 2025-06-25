fx_version 'bodacious'
author 'Arcano'
name 'arc.Panel'
description 'arc.Panel'
game 'gta5'

shared_scripts {
	"shared/shared.lua",
    'list/*.lua',
}

ui_page("NUI/index.html")

files {
	"NUI/index.html",
    "NUI/script.js",
    "NUI/styles.css",
	"NUI/imgs/*.png",
    "NUI/imgs/*.jpg",
    "NUI/sounds/*.mp3",

    "cfg/cfg.json"
}

server_scripts {
    "@arc.lib/utils.lua",

    "@garages/server-side/core.lua",
    "@vrp/config/Item.lua",

    'cfg/__framework_sv.lua',
    'server.lua'
}

file_set 'props' {
    'list/props.txt',
}

client_scripts {
    'cfg/__framework_cl.lua',
    'client.lua',
}

dependency 'oxmysql'