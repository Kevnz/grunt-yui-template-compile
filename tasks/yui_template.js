/*
 * grunt-yui-template
 * https://github.com/earnubs/grunt-yui-template
 *
 * Copyright (c) 2014 Stephen Stewart
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path'),
    Q = require('q'),
    htmlparser = require('htmlparser2'),
    Handlebars  = require('yui/handlebars').Handlebars,
    Micro = require('yui/template-micro').Template.Micro;

    function getExtension(filename) {
        var ext = (filename[0]||'').split('.');
        return ext[ext.length - 2];
    }


    /**
     * parse the file as html
     * @param {String} filepath
     **/
    function parseHTML(filepath, html, callback) {

        var deferred = Q.defer();
        var handler = new htmlparser.DomHandler(function(err, dom) {

            if (err) {
                deferred.reject(err);
            }

            var ext = getExtension(filepath);
            deferred.resolve(parsedFileDomHandler(dom, ext));

        });

        var parser = new htmlparser.Parser(handler);

        parser.parseComplete(html);

        return deferred.promise;
    }

    /**
     * handle the parsed dom
     * @param {Object} dom
     * @param {String} type Y.Template.Micro or Y.Template.Handlebars
     */
    function parsedFileDomHandler( dom ) {
        var i = 0, l = dom.length, node, html, namespace,

        output = '';

        if (l) {

            for (; i < l; i++ ) {
                node = dom[i];
                if ( node.type === 'script' ) {
                    if (
                        ( node.attribs.type === 'x-template' ||
                         node.attribs.type === 'text/x-handlebars-template' ) &&
                             node.children && node.children[0].type === 'text'
                    ) {
                        html = node.children[0].data;
                        namespace = node.attribs.id;

                        output += 'var engine, tmpl = ';

                        if ( node.attribs.type === 'text/x-handlebars-template' ) {
                            console.log('Precompiling \'' + node.attribs.id + ', a Y.Handlebars type template...');
                            output += Handlebars.precompile(html) + ';\n';
                            output += 'engine = new Y.Template(Y.Handlebars);';
                        }

                        if ( node.attribs.type === 'x-template' ) {
                            console.log('Precompiling \'' + node.attribs.id + ', a Y.Template.Micro type template...');
                            output += Micro.precompile(html) + ';\n';
                            output += 'engine = new Y.Template();';
                        }

                        output += '\nY.Template.register("'+namespace+'", engine.revive(tmpl));\n\n';

                    } else {
                        console.warn('<script> element empty or has unknown type attribute, skipping');
                    }
                }
            }

        } else {
            console.warn("Empty DOM object, nothing to do.");
        }

        return output += '\n\n';
    }

    // execute the func for each element in the array and collect the  results
    function map (arr, iterator) {
        var promises = arr.map(function (el) { return iterator(el) })
        return Q.all(promises) // return the group promise
    }


module.exports = function(grunt) {

    grunt.registerMultiTask('yui_template', 'Precompile Y.Template files.', function() {

        var done = this.async();
        var len = this.files.length;

        if (len) {
            grunt.log.writeln('Number of files with templates to compile: ' + len);
        } else {
            grunt.log.error('No templates found to compile...');
        }

        map(this.files, function(f) {

            var src = f.src;
            var dest = f.dest;


            parseHTML(src, grunt.file.read(src))
            .then(function(result) {

                grunt.log.oklns(dest + ' precompiled OK!');
                grunt.file.write(dest, result);

            }, function(err) {
                grunt.log.error(err);
            });

        })
        .then( done, grunt.log.error );
    });
};
