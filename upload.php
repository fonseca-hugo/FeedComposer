<?php
// HANDLE FILE
// STORE IN MEDIA COLLECTION
// FOR LATER PROCESSING

$mediaFiles = !empty($_FILES['media_file']) ? $_FILES['media_file'] : array();

header('Content-Type: application/json');
echo json_encode(array(
    'success' => 1,
    'id' => rand(1, 10),
    'name' => $mediaFiles['name'],
    'type' => $mediaFiles['type']
));