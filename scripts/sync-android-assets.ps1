$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$assetsRoot = Join-Path $repoRoot 'android\app\src\main\assets'

$null = New-Item -ItemType Directory -Force -Path $assetsRoot

function Reset-Dir($path) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
    }
    $null = New-Item -ItemType Directory -Force -Path $path
}

function Copy-Dir($source, $destination) {
    if (-not (Test-Path $source)) {
        Write-Error "Missing source: $source"
    }
    $null = New-Item -ItemType Directory -Force -Path $destination
    Copy-Item -Recurse -Force -Path $source -Destination $destination
}

Reset-Dir (Join-Path $assetsRoot 'renderer_build')
Copy-Dir (Join-Path $repoRoot 'src\renderer_build\*') (Join-Path $assetsRoot 'renderer_build')

Reset-Dir (Join-Path $assetsRoot 'renderer')
Copy-Dir (Join-Path $repoRoot 'src\renderer\resources') (Join-Path $assetsRoot 'renderer\resources')

Reset-Dir (Join-Path $assetsRoot 'node_modules')
$nodeModules = Join-Path $repoRoot 'node_modules'
$libs = @(
    'entry-js',
    'entry-tool',
    'lodash',
    'jquery',
    'literallycanvas-mobile',
    '@entrylabs\legacy-video'
)

foreach ($lib in $libs) {
    $source = Join-Path $nodeModules $lib
    $destination = Join-Path $assetsRoot (Join-Path 'node_modules' $lib)
    Copy-Dir $source $destination
}

Reset-Dir (Join-Path $assetsRoot 'weights')
Copy-Dir (Join-Path $nodeModules 'entry-js\weights') (Join-Path $assetsRoot 'weights')

Write-Output "Android assets synced to $assetsRoot"
