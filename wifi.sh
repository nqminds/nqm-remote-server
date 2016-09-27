if [[ "$1" == "-ssid" && "$3" == "-pwd" && "$5" == "-disable" ]]
then
        #uci set wireless.@wifi-iface[-1].ssid=$2
        #uci set wireless.@wifi-iface[-1].key=$4
        #uci set wireless.@wifi-device[-1].disabled=$6
        #uci commit wireless
        echo $2
        echo $4
        echo $6
        echo 'wifi changed'
elif [[ "$2" == "-pwd" && "$4" == "-disable" ]]
then
    #uci set wireless.@wifi-iface[-1].key=$3
    #uci set wireless.@wifi-device[-1].disabled=$5
    #uci commit wireless
    #wifi
    echo 'wifi changed password'
elif [[ "$1" == "-ssid" && "$3" == "-pwd" && "$4" == "-disable" ]]
then 
    #uci set wireless.@wifi-iface[-1].ssid=$2
    #uci set wireless.@wifi-device[-1].disabled=$5
    #uci commit wireless
    #wifi
    echo 'wifi change password'
elif [[ "$3" == "-disable" ]]
then
    #uci set wireless.@wifi-device[-1].disabled=$4
    #uci commit wireless
    #wifi
    echo 'wifi disable changed'    
fi
