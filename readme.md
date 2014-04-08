FeedComposer
===========

FeedComposer allows you to create media enriched Posts for a feed, like [Facebook](http://facebook.com). Supports Drag and Drop.


Dependencies
========

FeedComposer depends on [jQuery](http://jquery.com).

Features
========

FeedComposer allows to add Comments, Photos, Mention people and use Hashtags. Photos can be uploaded via the input selection or drag and drop.

*\*This is not a Standalone library or a Plugin, it's a working proof of concept of a Feed Composer. You can use it, but it may require you to build the backend, as well as to do tweaks to integrate on your code.*

*\*Only the most recent browsers are supported*

Usage
========

Default usage:

<pre>
$(document).ready(function () {
    HFFC.initComposer();
});
</pre>

Override the default Composer Wrapper Class:

<pre>
HFFC.initComposer({composerWrapper: '.feed-composer-wrapper'});
</pre>

Change the default max number of files allowed:

<pre>
HFFC.initComposer({maxFileNumber: 5});
</pre>

Change the default entities list item template:

<pre>
HFFC.initComposer({mentionTemplate: "<div>{{name}}</div>"});
</pre>

Options
=======

Various options may be passed along to FeedComposer:

<pre>
HFFC.setup({
	// options
	option1: 'value',
	option2: 'value',
	option3: 'value'
	// etc...
});
</pre>


List of options and description:

<pre>
    composerWrapper
</pre>
The wrapper class around the feed composer.

<pre>
    composer
</pre>
The composer class name.

<pre>
    dropZoneWrapper
</pre>
The drop zone wrapper class for the drop zone.

<pre>
    dropZone
</pre>
The drop zone class.

<pre>
    maxFileSize
</pre>
The max file size allowed.

<pre>
    maxFileNumber
</pre>
The max file number allowed.

<pre>
    mentionTemplate
</pre>
The entities list item html template.

<pre>
    thumbnailTemplate
</pre>
The media image thumbnail preview html template.

<pre>
    postTemplate
</pre>
The create post html template.

License
========

FeedComposer is licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
