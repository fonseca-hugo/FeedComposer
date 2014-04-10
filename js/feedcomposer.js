/**! ===================================================
 * feedComposer.js v0.1.0
 * https://github.com/fonseca-hugo/FeedComposer
 *
 * @name feedComposer.js
 * @author Hugo Fonseca (http://hugofonseca.co.uk)
 * @version 0.1.0
 * @date 03/04/2014
 * ===================================================
 * Copyright (c) 2014 Hugo Fonseca (fonseca.hugo@gmail.com)
 *
 * Allows to create Posts for a feed. Accepts Photos, Mentions and Hashtags.
 *
 * To Mention, we can plugin an AJAX call once to get the entities to mention,
 * and store it locally, or keep querying the server on keypress.
 *
 * The Photos, are being uploaded as soon as the user adds them, and the server
 * returns the media ID. Which will be sent together with the post
 * (if the post is never completed, them there should be a script to cleanup later).
 * This allows the user to be focused on what their writing, while the files are being uploaded.
 *
 * ==========================================================
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==========================================================
 */
HFFC = (function () {
    "use strict"; /* global HFFC, $, console */
    return {
        defaults: {
            composerWrapper: '.feed-composer-wrapper',
            composer: '.feed-composer',
            dropZoneWrapper: '.js-drop-files',
            dropZone: '.drop-zone',
            maxFileSize: 3145728, // 3MB
            maxFileNumber: 10,
            mentionTemplate: '<div class="mention-item" data-name="{{name}}" data-id="{{id}}"><img src="{{avatar_url}}" alt=""/>{{name}}</div>',
            thumbnailTemplate: '<div class="thumbnail" data-id="{{id}}"><a href="#" class="close">&times;</a><div class="progress"><div class="bar progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div><img src="{{img}}" alt=""></div>',
            postTemplate: '<div class="post-item">' +
                '<div class="header"><div class="user"><a href="{{user_url}}"><img src="{{avatar_url}}" alt=""/>{{name}}</a></div><span>{{timeago}}</span></div>' +
                '<div class="content">{{comment}}</div>' +
                '</div>'
        },
        options: {},
        dragCount: 0,
        isDragging: 0,
        /**
         * Initialize the Composer
         */
        initComposer: function (options) {
            this.setOptions(options);
            this.initControls();
            if (this.supportsFileApi()) {
                this.initDragListeners();
            }
            this.initFileSupport();
        },
        /**
         * Sets the options for the composer.
         *
         * @param options Options to override the defaults
         **/
        setOptions: function (options) {
            if (typeof options !== "undefined") {
                this.options = options;
            }
            // Override defaults for submitted options.
            for (var i in this.defaults) {
                if (!this.options[i]) {
                    this.options[i] = this.defaults[i];
                }
            }
        },
        /**
         * Initializes the Composer Controls and Events
         */
        initControls: function () {
            var composerWrapper = $(this.options.composerWrapper),
                entitiesList = composerWrapper.find('.js-mentions-list'),
                form = composerWrapper.find('.js-comment-form');

            HFFC.resetCommentBox(form, 1);

            composerWrapper.on("submit", ".js-comment-form", function (e) {
                var form = $(this),
                    submitBtn = form.parents('.js-comment-container').find('.js-submit'),
                    commentContent = form.find('.js-comment-content'),
                    formData = form.data('data'),
                    postData = {
                        content: commentContent.val()
                    },
                    template;

                if (postData.content && !submitBtn.hasClass("loading")) {
                    formData.tags = HFFC.getHashtags(postData.content); // checking for the tags
                    postData = HFFC.addMetaDataToPost(postData, formData);
                    $.ajax({
                            url: form.attr('action'),
                            data: postData,
                            type: "POST",
                            beforeSend: function () {
                                submitBtn.attr("disabled", "disabled").addClass("loading");
                                commentContent.attr("disabled", "disabled");
                            },
                            success: function (data) {
                                submitBtn.removeAttr("disabled").removeClass("loading");
                                commentContent.removeAttr("disabled");
                                if (data.success) {
                                    HFFC.resetCommentBox(form, 0);
                                    postData = {
                                        avatar_url: data.user.avatar_url,
                                        name: data.user.name,
                                        username: data.user.username,
                                        user_url: data.user.user_url,
                                        timeago: data.timeago,
                                        comment: data.postData.replace(/@\[([^:]+):([^\]]+)\]/g, '<a class="blue" href="$1">$2</a>')
                                    };
                                    template = HFFC.renderTemplate(HFFC.options.postTemplate, postData);
                                    $(template).insertAfter(composerWrapper.find(HFFC.options.composer));
                                }
                            },
                            error: function () {
                                submitBtn.removeClass("loading-state").removeAttr("disabled");
                                commentContent.removeAttr("disabled");
                            }
                        }
                    );
                }

                HFFC.preventDefaultPropagation(e);
                return false;
            }).on('click', '.js-submit', function (e) { // Submit Form
                HFFC.preventDefaultPropagation(e);
                $(this).parents('.js-comment-container').find('.js-comment-form').submit();
            }).on("keydown", ".js-comment-content", function (e) { // Detect character deletion, navigation on entities list or enter for post
                var key = (e.keyCode ? e.keyCode : e.which),
                    input = $(this);

                HFFC.checkKeydownEvents(input, e, key);
            }).on("keypress paste", ".js-comment-content", function (e) { //
                var form = $(this).closest(".js-comment-form"),
                    key = 0; // to prevent "." bug e.g., 46 is ".", but as keydown is "del" button

                HFFC.detectMentionsInSelectionRange($(this), form, key, e);
            }).on('keyup', '.js-comment-content', function (e) { //#hashtag && UGC
                var input = $(this),
                    key = (e.keyCode ? e.keyCode : e.which);

                HFFC.checkForMentions(input, key);
            }).on("focus select", ".js-comment-content", function (e) { // Only load entities list, if user manifests interest in typing
                if (!HFFC.entitiesList) {
                    HFFC.getEntitiesList();
                }
                HFFC.preventDefaultPropagation(e);
            }).on('click', '.js-mentions-list .mention-item', function (e) { // if click on a name, in the comment box
                var form = $(this).parents('.js-comment-form');

                HFFC.displayMention(form, $(this));
                HFFC.preventDefaultPropagation(e);
            });
            /* Detect Click outside composer and close entities list */
            $('body').on('click', function (e) {
                entitiesList.each(function () {
                    if ($(this).is(":visible")) {
                        if (!$(e.target).hasClass('mention-item') && $(e.target).parents(".mention-item").length === 0) {
                            $(this).slideUp(100);
                        }
                    }
                });
            });
        },

        /********************** MEDIA **********************/

        /**
         * Adds the Listeners for the Drag Events
         */
        initDragListeners: function () {
            var that = this;
            $(window).on('dragenter', function (e) {
                var target = $(e.target).parents(that.options.dropZone);
                /*
                 * Check dragging is already active, since it will be triggered whenever mouse enters a new element.
                 * If previously triggered, then increase count
                 */
                if (!that.isDragging) {
                    that.startStopDragging(1);
                } else {
                    that.dragCount++;
                }
                if (target.length) {
                    that.preventDefaultPropagation(e);
                }
            }).on('dragleave', function () {
                that.dragCount--;
                if (that.dragCount <= 0) {
                    that.startStopDragging(0);
                }
            }).on('dragover', function (e) {
                if ($(e.target).parents(that.options.dropZone).length) {
                    that.preventDefaultPropagation(e);
                }
            }).on('dragstart', function () {
                that.startStopDragging(1);
            }).on('drop', function (e) {
                var target = $(e.target),
                    form = target.parents(that.options.dropZoneWrapper).find('.js-comment-form');
                that.preventDefaultPropagation(e);
                that.startStopDragging(0);
                that.processFiles(form, e.originalEvent.dataTransfer.files);
            }).on('dragend', function () {
                that.startStopDragging(0);
            });
        },
        /**
         * Initialize Media Preview Events
         */
        initFileSupport: function () {
            var form = $(this.options.dropZoneWrapper).find('.js-comment-form');

            form.on('click', '.close', function () {
                var formData = form.data('data'),
                    id = $(this).parent().data('id');

                formData.files.splice(id, 1);
                form.data('data', formData);
                $(this).parent().remove();
                HFFC.checkForMaxFiles(form);
            }).on('click', '.js-upload-media, .thumbnail.add-file', function () {
                form.find('.file-input').trigger('click');
            }).on('change', '.file-input', function (e) {
                HFFC.processFiles(form, e.target.files);
            });
        },
        /**
         * Verifies if the browser supports the File Api
         *
         * @returns {boolean}
         */
        supportsFileApi: function () {
            var input;

            if (typeof HFFC.supportsFileApi !== 'boolean') {
                input = document.createElement("input");
                input.setAttribute("type", "file");
                HFFC.supportsFileApi = !!input.files;
            }
            return HFFC.supportsFileApi;
        },
        /**
         * Shows / Hides the Drop Zone Placeholder
         * @param start
         */
        startStopDragging: function (start) {
            if (start) {
                $('.js-drop-files').addClass('drag-ready');
            } else {
                $('.js-drop-files').removeClass('drag-ready');
            }
            HFFC.isDragging = start;
            HFFC.dragCount = start;
        },
        /**
         * Processes the the received / dropped files
         * Uploads the files immediately, and receives a media ID, to be used when the post is created
         *
         * @param form
         * @param files
         * @param e
         */
        processFiles: function (form, files) {
            var len = files.length,
                file,
                i,
                maxSize = this.options.maxFileSize;

            for (i = 0; i < len; i++) {
                file = files[i];
                if (file.size && file.size <= maxSize && file.type.match(/\/(gif|png|jpe?g)$/i)) {
                    (function (file) { // closure
                        var reader = new FileReader(),
                            formData;

                        if (HFFC.checkForMaxFiles(form)) { // check before sending
                            reader.onload = function (re) {
                                var thumbnail,
                                    progress,
                                    bar,
                                    data;

                                thumbnail = HFFC.addPhotoToPreviewContainer(form, re.target.result);
                                progress = thumbnail.find('.progress');
                                bar = progress.children('.progress-bar');

                                data = new FormData();
                                data.append('media_file', file);

                                $.ajax({
                                        url: 'upload.php',
                                        data: data,
                                        type: 'POST',
                                        processData: false,
                                        contentType: false,
                                        beforeSend: function () {
                                            progress.show();
                                            form.find('.js-submit').attr('disabled', 'disabled');
                                        },
                                        xhr: function () {
                                            var myXhr = $.ajaxSettings.xhr();
                                            if (myXhr.upload) {
                                                myXhr.upload.addEventListener('progress', function (progress) {
                                                        var total = progress.totalSize || file.size,
                                                            totalSize = progress.totalSize || progress.loaded,
                                                            percentage = Math.floor((total / totalSize) * 100) + '%';
                                                        bar.width(percentage);
                                                        bar.attr('aria-valuenow', percentage);
                                                    }, false
                                                );
                                            }
                                            return myXhr;
                                        },
                                        success: function (data) {
                                            progress.hide();
                                            form.find('.js-submit').removeAttr('disabled'); // TODO: check if still uploading another
                                            if (data.success) {
                                                if (HFFC.checkForMaxFiles(form)) {
                                                    formData = form.data('data');
                                                    formData.files.push(data.id);
                                                    form.data('data', formData);
                                                    HFFC.checkForMaxFiles(form);
                                                } else {
                                                    thumbnail.remove();
                                                }
                                            } else {
                                                thumbnail.remove();
                                            }
                                        },
                                        error: function () {
                                            thumbnail.remove(); // TODO: TRY AGAIN ?
                                            form.find('.js-submit').removeAttr('disabled'); // TODO: check if still uploading another
                                        }
                                    }
                                );
                            };
                            reader.readAsDataURL(file);
                        }
                    })(file);
                } else {
                    console.log("File not supported"); //TODO: show error message
                }
            }
        },
        /**
         * Verifies if there are already enough files in the post
         *
         * @param form
         * @returns {boolean}
         */
        checkForMaxFiles: function (form) {
            var maxFiles = HFFC.options.maxFileNumber,
                formData = form.data('data'),
                fileList = formData.files,
                result = false;

            if (fileList.length < maxFiles) {
                form.find('.fileinput .thumbnail.add-file').show();
                form.find('.js-upload-media').removeAttr('disabled');
                result = true;
            } else {
                form.find('.fileinput .thumbnail.add-file').hide();
                form.find('.js-upload-media').attr('disabled', 'disabled');
            }

            return result;
        },
        /**
         * Adds the received / dropped file to the media preview container
         *
         * @param container
         * @param url
         * @returns object
         */
        addPhotoToPreviewContainer: function (container, url) {
            var fileInput = container.find('.fileinput'),
                inputPreview = fileInput.find('.fileinput-preview'),
                data = {
                    id: inputPreview.find('.thumbnail').length - 1,
                    img: url
                },
                thumbnail = $(HFFC.renderTemplate(HFFC.options.thumbnailTemplate, data));

            inputPreview.prepend(thumbnail);
            fileInput.show();

            return thumbnail;
        },

        /********************** MENTIONS / HASHTAGS **********************/

        /**
         * Get the entities list and stores locally.
         * Those entities can be used in the mentions
         *
         * @param callback - Callback to run after the entities were loaded (or retrieved)
         */
        getEntitiesList: function (callback) {
            var that = this,
                url;

            if (that.entitiesList) {
                if (typeof callback === "function") {
                    callback();
                }
            } else {
                url = $(that.options.composer).data('entities-url');
                if (url) {
                    $.ajax({
                        url: url,
                        success: function (data) {
                            if (data.count > 0) {
                                that.entitiesList = data.entities;
                                if (typeof callback === "function") {
                                    callback();
                                }
                            }
                        }
                    });
                }
            }
        },
        /**
         * Extract the #hashtags
         *
         * @param value
         * @return
         */
        getHashtags: function (value) {
            var data;

            value = value + ' ';
            data = value.match(/\#\w+\s*/ig);

            if (data !== null) {
                data = $.unique(data);
            }

            return data;
        },
        /**
         * Reset the comment box
         *
         * @param form
         */
        resetCommentBox: function (form, init) {
            var commentContent = form.find('.js-comment-content'),
                formData = {
                    mentions: [],
                    mentionsPos: [],
                    mentionsFormat: '',
                    tags: [],
                    files: []
                };

            form.data('data', formData); // mentions, tags, files, ...
            commentContent.val('').attr('style', '');
            if (!init) {
                commentContent.focus();
            }
            HFFC.updateHighLighter(form.find('.highlighter-content'), {});
        },
        /**
         * Add the Metadata like Mentions, Tags and File IDs to the post
         *
         * @param post - the post data to submit
         * @param data - the metadata
         * @returns post - the post data to submit
         */
        addMetaDataToPost: function (post, data) {
            if (!$.isEmptyObject(data.mentions)) {
                post.mentions = data.mentions;
            }
            if (typeof data.mentionsFormat !== "undefined") {
                post.mentionsFormat = data.mentionsFormat;
                post.content = data.mentionsFormat.replace(/@\[[^:]+:([^\]]+)\]/g, '$1');
            }
            if (!$.isEmptyObject(data.tags)) {
                post.tags = data.tags;
            }
            if (!$.isEmptyObject(data)) {
                post.files = data.files;
            }

            return post;
        },
        /**
         * Display the selected mention name on the comment box
         *
         * @param form
         * @param item
         * @returns {boolean}
         */
        displayMention: function (form, item) {
            var commentField = form.find('.js-comment-content'),
                entitiesList = form.find('.js-mentions-list'),
                formData = form.data('data'),
                data,
                lastIndex,
                textBefore,
                mention,
                mentionPos;

            item = (typeof item !== 'undefined') ? item : form.find('.selected');
            data = {name: item.data('name'), id: item.data('id')};

            formData.mentions = !$.isEmptyObject(formData.mentions) ? formData.mentions : [];
            formData.mentions.push(data);

            // Display people @mentioned in the textarea
            lastIndex = commentField.val().lastIndexOf('@');
            textBefore = commentField.val().substr(0, lastIndex); // just keep the previous text
            commentField.focus().val(textBefore + data.name + ' ');

            mentionPos = {
                from: textBefore.length,
                length: data.name.length
            };

            // update formatted mentions
            lastIndex = formData.mentionsFormat.lastIndexOf('@');
            textBefore = formData.mentionsFormat.substr(0, lastIndex);
            mention = '@[' + data.id + ':' + data.name + '] ';
            formData.mentionsFormat = textBefore + mention;

            mentionPos.orig = {
                from: textBefore.length,
                length: mention.length,
                pos: formData.mentions.length - 1
            };

            formData.mentionsPos.push(mentionPos); // update mentions positions
            HFFC.updateHighLighter(form.find('.highlighter-content'), formData); // update styled mentions
            form.data('data', formData); // update mentions in form

            entitiesList.hide();

            return true;
        },
        /**
         * Updates the highlighter with the user input information
         *
         * @param highlighter
         * @param formData
         */
        updateHighLighter: function (highlighter, formData) {
            var text = '';

            if (typeof formData.mentionsFormat !== "undefined") {
                text = formData.mentionsFormat.replace(/\</g, "&lt;"); // prevent script injection
                text = text.replace(/\>/g, "&gt;");
                text = text.replace(/@\[[^:]+:([^\]]+)\]/g, '<b>$1</b>'); // replace mentions
            }

            highlighter.html(text);
        },

        /**
         * Checks if a mentions is highlighted (selected) and the user tries to delete
         * Controls Entities List Navigation
         *
         * @param elem - the textarea
         * @param e - the event
         * @param key - the key pressed
         */
        checkKeydownEvents: function (elem, e, key) {
            var form = elem.parents('.js-comment-form'),
                entitiesList = form.find('.js-mentions-list');

            if ((key === 8 || key === 46)) { // if mentions exist, check if it's deleting any
                HFFC.detectMentionsInSelectionRange(elem, form, key, e);
            } else if (elem.val().search(/\@\w+$/i) !== -1) { // mention with @
                if (key === 40 && form.find('.selected').next().length) { // down
                    entitiesList.scrollTop(form.find('.selected').outerHeight() * form.find('.selected').next().index());
                    form.find('.selected').removeClass('selected').next().addClass('selected');
                    HFFC.preventDefaultPropagation(e);
                } else if (key === 38 && form.find('.selected').prev().length) { // up
                    entitiesList.scrollTop(form.find('.selected').outerHeight() * form.find('.selected').prev().index());
                    form.find('.selected').removeClass('selected').prev().addClass('selected');
                    HFFC.preventDefaultPropagation(e);
                } else if (key === 13 && form.find('.js-mentions-list').is(':visible')) {
                    HFFC.preventDefaultPropagation(e);
                    form.find('.selected').trigger('click'); // Select Mention
                } else if (key === 27) {
                    HFFC.preventDefaultPropagation(e);
                    entitiesList.hide();
                }
            } else if (elem.val() !== "" && key === 13) {
                HFFC.preventDefaultPropagation(e);
                form.find('.js-submit').trigger('click'); // Submit Form
            }
        },
        /**
         * Check if selection includes a mention and remove it
         *
         * @param elem
         * @param form
         * @param key
         */
        detectMentionsInSelectionRange: function (elem, form, key, e) {
            var formData = form.data('data'),
                mPos = formData.mentionsPos,
                selRange = HFFC.getSelectionRange(elem),
                remove,
                tempCopy,
                origLength,
                length,
                from,
                to,
                newCursorPos = -1,
                posToUpdate = [],
                padding = 0,
                charCode,
                selStart,
                selEnd,
                updateInput = false;

            if (key === 8) {
                if (selRange.start && selRange.end === selRange.start) {
                    selRange.start -= 1;
                }
            } else if (key === 46) {
                if (selRange.end === selRange.start) {
                    selRange.end += 1;
                }
            }

            if (formData.mentions.length) { // check all mentions
                for (var i = 0; i < mPos.length; i++) { // check if deleting or overwriting
                    length = mPos[i].length;
                    to = mPos[i].from + length - 1;
                    remove = false;
                    if (!((key !== 8 && key !== 46) && selRange.start === mPos[i].from)) { //ignore to insert new chars
                        if (selRange.start >= mPos[i].from && selRange.start <= to) { // if start is within a mention
                            remove = true;
                            newCursorPos = mPos[i].orig.from;
                        } else if (selRange.end > mPos[i].from && selRange.end < to) { // if end is within a mention
                            remove = true;
                        } else if (selRange.start < mPos[i].from && selRange.end > to) { // if selection contains a mention
                            remove = true;
                        }
                    }

                    if (remove) {
                        updateInput = true;
                        origLength = mPos[i].orig.length - 1;
                        from = mPos[i].orig.from;
                        to = from + origLength;

                        tempCopy = formData.mentionsFormat.slice(0, mPos[i].orig.from) + formData.mentionsFormat.slice(to);
                        formData.mentionsFormat = tempCopy;
                        formData.mentions.splice(mPos[i].orig.pos, 1);
                        formData.mentionsPos.splice(i, 1);
                        formData = HFFC.checkToUpdateMentionsPositions(formData, formData.mentionsPos, from, length, origLength);
                        break;
                    } else { // check if before
                        if (selRange.start <= mPos[i].from) {
                            posToUpdate.push(i);
                        } else {
                            padding += (mPos[i].orig.length - mPos[i].length) - 1;
                        }
                    }
                }
            }

            selStart = selRange.start + padding;
            selEnd = selRange.end + padding;
            newCursorPos = (newCursorPos < 0) ? selStart : newCursorPos;

            if (!updateInput) { // then update mentions Format
             if ((key === 8 && (selRange.start || selRange.end)) // Backspace and if not first position
                || key === 46) {
                    tempCopy = formData.mentionsFormat.slice(0, selStart) + formData.mentionsFormat.slice(selEnd);
                    formData.mentionsFormat = tempCopy;
                    formData = HFFC.updateMentionsPositions(formData, posToUpdate, -1, -1);
                } else {
                    // Ignore meta keys and ctrl, but allow ALT GR on Windows (ctrlkey + altkey)
                    if (!e.metaKey && (!e.ctrlKey || (e.ctrlKey && e.altKey))) {
                        charCode = '';
                        if (e.type === 'paste') {
                            if (e.originalEvent.clipboardData) {
                                charCode = e.originalEvent.clipboardData.getData('Text');
                            } else if (e.view && e.view.clipboardData) {
                                charCode = e.view.clipboardData.getData('text');
                            } else if (window.clipboardData) { // ie??
                                charCode = window.clipboardData.getData('text');
                            }
                        } else {
                            if (e.charCode) {
                                charCode = String.fromCharCode(e.charCode);
                            } else if (window.clipboardData && e.keyCode) { // ie8??
                                charCode = String.fromCharCode(e.keyCode);
                            }
                        }
                        tempCopy = formData.mentionsFormat.slice(0, selStart) + charCode + formData.mentionsFormat.slice(selEnd);
                        formData.mentionsFormat = tempCopy;
                        formData = HFFC.updateMentionsPositions(formData, posToUpdate, charCode.length, charCode.length);
                    }
                }
            }
            form.data('data', formData);
            HFFC.updateHighLighter(form.find('.highlighter-content'), formData); // update Highlight Copy
            if (updateInput) {
                if (key === 8 || key === 46) {
                    HFFC.preventDefaultPropagation(e);
                }
                elem.val(form.find('.highlighter-content').text()).focus(); // update textarea with highlight copy
                if (window.getSelection) {
                    elem.prop('selectionStart', newCursorPos).prop('selectionEnd', newCursorPos);
                }
            }
        },
        /**
         * Update Mentions Positions if necessary
         *
         * @param formData
         * @param mPos
         * @param from
         * @param length
         * @param origLength
         * @returns object
         */
        checkToUpdateMentionsPositions: function (formData, mPos, from, length, origLength) {
            for (var i = 0; i < mPos.length; i++) {
                if (mPos[i].orig.from > from) {
                    formData = HFFC.updateMentionsPositions(formData, [i], (-1 * length), (-1 * origLength));
                }
            }
            return formData;
        },
        /**
         * Update Mentions Positions
         *
         * @param formData
         * @param posToUpdate
         * @param length
         * @param origLength
         * @returns object
         */
        updateMentionsPositions: function (formData, posToUpdate, length, origLength) {
            for (var i = 0; i < posToUpdate.length; i++) {
                formData.mentionsPos[posToUpdate[i]].from += length;
                formData.mentionsPos[posToUpdate[i]].orig.from += origLength;
            }
            return formData;
        },
        /**
         * Check if user has entered a "@" to start a mention and display results
         *
         * @param elem
         * @param e
         * @param key
         */
        checkForMentions: function (elem, key) {
            var that = elem,
                filteredEntitiesList,
                lastIndex,
                filter,
                form = elem.parents('.js-comment-form'),
                entitiesList = form.find('.js-mentions-list'),
                condition = (that.val() !== "" && key !== 38 && key !== 40 && key !== 13),
                entity,
                i,
                template,
                html;


            if (condition && that.val().search(/\@\w+$/i) !== -1) { // mention with @
                lastIndex = that.val().lastIndexOf('@');
                filter = that.val().substr(lastIndex + 1);

                if (filter.length) {
                    filteredEntitiesList = [];
                    HFFC.entitiesList = HFFC.entitiesList || [];
                    for (i = 0; i < HFFC.entitiesList.length; i++) {
                        entity = HFFC.entitiesList[i];
                        if (entity.key.match(new RegExp(filter, 'i'))) {
                            filteredEntitiesList.push(entity);
                        }
                    }
                    if (filteredEntitiesList.length) {
                        template = HFFC.options.mentionTemplate;
                        html = '';
                        for (i = 0; i < filteredEntitiesList.length; i++) {
                            html += HFFC.renderTemplate(template, filteredEntitiesList[i]);
                        }
                        entitiesList.html(html).show().children(":first").addClass('selected');
                    } else {
                        entitiesList.hide();
                    }
                }
            }
        },

        /********************** UTILITIES **********************/

        /**
         * Return the current selection range
         *
         * @param elem
         * @returns {start: number, end: number}
         */
        getSelectionRange: function (elem) {
            var selRange = {
                start: 0,
                end: 0
            };

            if (window.getSelection) {  // all browsers, except IE before version 9
                selRange.start = elem.prop('selectionStart');
                selRange.end = elem.prop('selectionEnd');
            }

            return selRange;
        },
        /**
         * Utility to prevent default behaviour and propagation
         *
         * @param e - the event
         */
        preventDefaultPropagation: function (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
        },
        /**
         * Renders the template by replacing the placeholders
         *
         * @param template
         * @param data
         * @returns html
         */
        renderTemplate: function (template, data) {
            var item;

            for (item in data) {
                template = template.replace(new RegExp('{{' + item + '}}', 'g'), data[item]);
            }

            return template;
        }
    };
})();
