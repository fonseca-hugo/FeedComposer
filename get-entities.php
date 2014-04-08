<?php
/**
 * Created by PhpStorm.
 * User: Hugo
 * Date: 06-04-2014
 * Time: 20:48
 */

header('Content-Type: application/json');
$entities = array(
    'count' => 8,
    'entities' => array(
        array(
            'id' => 1,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'John Smith',
            'key' => 'john smith'
        ),
        array(
            'id' => 2,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'Nicole Pie',
            'key' => 'nicole pie'
        ),
        array(
            'id' => 3,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'Brian Evans',
            'key' => 'brian evans'
        ),
        array(
            'id' => 4,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'D\'Angelo Stevens',
            'key' => 'dangelo stevens'
        ),
        array(
            'id' => 5,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'Sir Eggert Love',
            'key' => 'sir eggert love'
        ),
        array(
            'id' => 6,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'Lady Lucas',
            'key' => 'lady lucas'
        ),
        array(
            'id' => 7,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'Mike Patton',
            'key' => 'mike patton'
        ),
        array(
            'id' => 8,
            'avatar_url' => 'img/noavatar.jpg',
            'name' => 'Lilly Tiger',
            'key' => 'lilly tiger'
        )
    )
);

echo json_encode($entities);