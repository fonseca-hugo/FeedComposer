<?php
// STORE POST
// CONNECT MEDIA RECORD TO POST
// RETURN POST PREVIEW

$comment = !empty($_POST['content']) ? $_POST['content'] : '';
$mentions = !empty($_POST['mentions']) ? $_POST['mentions'] : array();
$mentionsFormat = !empty($_POST['mentionsFormat']) ? $_POST['mentionsFormat'] : '';
$tags = !empty($_POST['tags']) ? $_POST['tags'] : array();
$files = !empty($_POST['files']) ? $_POST['files'] : array();

header('Content-Type: application/json');
echo json_encode(array(
    'success' => 1,
    'id' => rand(1, 10),
    'postData' => $mentionsFormat,
    'files' => $files, // TODO: send file img src and render carousel
    'user' => array ( // CURRENT LOGGED IN USER
        'id' => 100,
        'avatar_url' => 'img/noavatar.jpg',
        'username' => 'fakeuser',
        'name' => 'Demo User',
        'user_url' => '#'
    ),
    'timeago' => 'Just Now' // Dynamic
));