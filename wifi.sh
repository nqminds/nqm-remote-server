if [[ "$1" == "-ssid" && "$3" == "-pwd" ]]
then
        #uci set wireless.@wifi-iface[-1].ssid=$2
        #uci set wireless.@wifi-iface[-1].key=$4
        #uci commit wireless
        echo $2
        echo $4
        echo 'wifi changed'

fi
