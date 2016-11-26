/**
 * Created by julia on 07.11.2016.
 */
let EventEmitter = require('eventemitter3');
const winston = require('winston');
let fs = require("fs");
let path = require("path");
let util = require("util");
let GuildManager = require('./guildManager');
let PermManager = require('./permissionManager');
class CmdManager extends EventEmitter {
    constructor(l, v) {
        super();
        this.setMaxListeners(20);
        this.l = l;
        this.v = v;
        this.l.on('ready', (t) => {
            this.load(t, this.v);
            this.lngs = this.l.list;
        });
        this.t = null;
        this.g = new GuildManager();
        this.p = new PermManager();
        this.commands = {};
        this.ready = false;
    }

    load(t, v) {
        this.t = t;
        fs.readdir(path.join(__dirname, '../commands'), (err, files) => {
            let commands = {};
            for (let file of files) {
                if (file.endsWith('.js')) {
                    let command = require(path.join(__dirname, '../commands/', file));
                    let cmd = new command(t, v);
                    commands[cmd.cmd] = cmd;
                }
            }
            this.commands = commands;
            this.emit('ready', commands);
            this.ready = true;
        });
    }

    reload() {

    }

    unload() {

    }

    check(msg) {
        if (this.ready) {
            this.loadGuild(msg, (err, Guild) => {
                if (err) return winston.error(err);
                if (msg.content.startsWith(Guild.prefix)) {
                    try {
                        let cmd = msg.content.substr(Guild.prefix.length).split(' ')[0];
                        msg.lang = [Guild.lng, 'en'];
                        msg.lngs = this.lngs;
                        msg.cmds = this.commands;
                        msg.prefix = Guild.prefix;
                        msg.db = Guild;
                        let command = this.commands[cmd];
                        let node = `${command.cat}.${command.cmd}`;
                        // console.log(this.commands[command]);
                        this.p.checkPermission(msg, node, (err) => {
                            if (err) return msg.channel.createMessage(`No permission to use \`${node}\``);
                            console.log(cmd);
                            if (command.needGuild) {
                                if (msg.guild) {
                                    command.run(msg);
                                } else {
                                    return msg.channel.createMessage(this.t('generic.no-pm', {lngs: msg.lang}))
                                }
                            } else {
                                command.run(msg);
                            }
                        });
                    }
                    catch (err) {
                        winston.error(err.message);
                        winston.error(err.stack);
                    }
                }
            });
        }
    }

    loadGuild(msg, cb) {
        if (msg.guild) {
            this.g.loadGuild(msg.guild.id, (err, Guild) => {
                if (err) return cb(err);
                if (typeof (Guild) === 'undefined') {
                    Guild = {};
                }
                if (typeof (Guild.lng) === 'undefined') {
                    Guild.lng = 'en';
                }
                if (typeof (Guild.prefix) === 'undefined') {
                    Guild.prefix = '!w.';
                }
                cb(null, Guild);
            })
        } else {
            let Guild = {prefix: '!w.', lng: 'en'};
            cb(null, Guild);
        }
    }

    loadUser(msg, cb) {

    }
}
module.exports = CmdManager;