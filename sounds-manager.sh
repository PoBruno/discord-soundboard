#!/bin/bash

# Função para compactar todos os arquivos .mp3 em um arquivo tar
compress_mp3() {
    local source_dir="./backend/sounds/"
    local destination_tar="./backend/sounds/sounds.tar"

    if [ ! -d "$source_dir" ]; then
        echo "Diretório $source_dir não existe."
        return
    fi

    tar -cvf "$destination_tar" -C "$source_dir" *.mp3
    echo "Arquivos .mp3 compactados em $destination_tar."
}

# Função para descompactar o arquivo tar
decompress_mp3() {
    local source_tar="./backend/sounds/sounds.tar"
    local destination_dir="./backend/sounds/"

    if [ ! -f "$source_tar" ]; then
        echo "Arquivo $source_tar não existe."
        return
    fi

    tar -xvf "$source_tar" -C "$destination_dir"
    echo "Arquivo $source_tar descompactado em $destination_dir."
}

clear_mp3() {
    local source_dir="./backend/sounds/"
    local destination_tar="./backend/sounds/sounds.tar"

    if [ ! -d "$source_dir" ]; then
        echo "Diretório $source_dir não existe."
        return
    fi

    rm -rf "$source_dir"*.mp3
    echo "Arquivos .mp3 removidos."
}

# Verifica o argumento passado e executa a função correspondente
case "$1" in
    compress)
        compress_mp3
        ;;
    decompress)
        decompress_mp3
        ;;
    clear)
        clear_mp3
        ;;
    *)
        echo "Uso: $0 {compress|decompress|clear}"
        exit 1
esac

