#!/bin/bash
kill -TERM $PID || kill -KILL $PID
if [[ "$1" == "-git" ]]
then
    echo $2
echo 'git pulling new version of code'
fi
