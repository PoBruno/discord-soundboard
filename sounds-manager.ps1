param(
    [switch]$compress,
    [switch]$decompress,
    [switch]$clear
)

# Função para compactar todos os arquivos .mp3 em um arquivo tar
function Compress-MP3 {
    param (
        [string]$sourceDir = "./backend/sounds/",
        [string]$destinationTar = "./backend/sounds/sounds.tar"
    )

    if (-Not (Test-Path $sourceDir)) {
        Write-Host "Diretório $sourceDir não existe."
        return
    }

    tar -cvf $destinationTar -C $sourceDir *.mp3
    Write-Host "Arquivos .mp3 compactados em $destinationTar."
}

# Função para descompactar o arquivo tar
function Decompress-MP3 {
    param (
        [string]$sourceTar = "./backend/sounds/sounds.tar",
        [string]$destinationDir = "./backend/sounds/"
    )

    if (-Not (Test-Path $sourceTar)) {
        Write-Host "Arquivo $sourceTar não existe."
        return
    }

    tar -xvf $sourceTar -C $destinationDir
    Write-Host "Arquivo $sourceTar descompactado em $destinationDir."
}

# Função para excluir todos os arquivos .mp3
function Clear-MP3 {
    param (
        [string]$sourceDir = "./backend/sounds/"
    )

    if (-Not (Test-Path $sourceDir)) {
        Write-Host "Diretório $sourceDir não existe."
        return
    }

    Remove-Item $sourceDir*.mp3
    Write-Host "Arquivos .mp3 excluídos em $sourceDir."
}

# Executa a ação baseada nos parâmetros passados
if ($compress) {
    Compress-MP3
} elseif ($decompress) {
    Decompress-MP3
} elseif ($clear) {
    Clear-MP3
} else {
    Write-Host "Nenhuma ação foi especificada."
}
