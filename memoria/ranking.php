<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$file = __DIR__ . '/ranking.json';

if (!file_exists($file)) {
    file_put_contents($file, '[]');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_get_contents($file);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['name']) || !isset($input['time'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Se requiere nombre y tiempo']);
        exit;
    }

    $name = substr(trim($input['name']), 0, 20);
    $time = floatval($input['time']);

    if ($time <= 0 || $time > 3600) {
        http_response_code(400);
        echo json_encode(['error' => 'Tiempo invalido']);
        exit;
    }

    $rankings = json_decode(file_get_contents($file), true) ?: [];

    $rankings[] = [
        'name' => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
        'time' => round($time, 2),
        'date' => date('Y-m-d H:i:s'),
    ];

    // Sort by fastest time, keep top 20
    usort($rankings, function ($a, $b) {
        return $a['time'] <=> $b['time'];
    });
    $rankings = array_slice($rankings, 0, 20);

    file_put_contents($file, json_encode($rankings, JSON_PRETTY_PRINT));

    echo json_encode(['success' => true, 'rankings' => $rankings]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo no permitido']);
