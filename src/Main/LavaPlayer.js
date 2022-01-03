"use-strict";
const { Manager, TrackUtils, Player } = require("erela.js");
const Spotify = require("better-erela.js-spotify").default;
const AppleMusic = require("erela.js-apple");
const Deezer = require("erela.js-deezer");
const { EventEmitter2 } = require("eventemitter2");
const fetch = require("node-fetch");
const { Client, Message } = require("discord.js");
const Filter = require("./Lava_Filters");

/**
 * Discord Tunes lavalink setup property
 * @class {DiscordTunes}
 * @prop {object} [Client] client of discord.js
 * @prop {object} [Manager] <Client>.Manager to init Manager
 * @prop {string} [host] Lavalink host URI or IP address
 * @prop {number} [port] Lavalink port number
 * @prop {string} [password] Lavalink auth password
 * @prop {number} [retryDelay] [Optional] Delay of reconnecting to node if node has been disconnected
 * @prop {number} [retryAmount] [Optional] Retry amount of reconnecting to the node
 * @prop {boolean} [isHttps] Whether connection to lavalink is secure or not (secure = true either false)
 * @prop {boolean} [leaveOnEmpty] Whether will it leave on voice channel empty or not
 */

class LavaPlayer extends EventEmitter2 {
  /**
   *
   * @param {Client} client
   * @param {Manager} manager
   * @param {import("../types").manangerOptions} options
   */
  constructor(client, options = {}) {
    super();
    this.setMaxListeners(100);
    this.client = client;
    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.retryDelay = options.retryDelay;
    this.retryAmount = options.retryAmount;
    this.isHttps = options.isHttps;
    this.spotifyClientID = options.spotifyClientID;
    this.spotifyClientSecret = options.spotifyClientSecret;
    this.leaveOnEmpty = options.leaveOnEmpty || false;
    this.manager = new Manager({
      nodes: [
        {
          host: this.host,
          port: this.port,
          password: this.password,
          retryDelay: this.retryDelay || 5000,
          retryAmount: this.retryAmount || 5,
          secure: this.isHttps ? true : false,
        },
      ],
      send: (id, payload) => {
        const guild = this.client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
      },
      autoPlay: false,
      plugins: [
        new Spotify({
          clientID: this.spotifyClientID,
          clientSecret: this.spotifyClientSecret,
          cacheTrack: true,
        }),
        new AppleMusic(),
        new Deezer(),
        new Filter(),
      ],
    });
    if (!this.host)
      throw new Error(`Lavalink connection URL or IP is required.`);
    if (!this.port) throw new Error(`Lavalink port is required.`);
    if (!this.password) throw new Error(`Lavalink password is required.`);
    if (!this.isHttps) this.isHttps = false;
    if (!this.spotifyClientID) throw Error(`Spotify client id is required.`);
    if (!this.spotifyClientSecret)
      throw Error(`Spotify client secret is required.`);
    client.on("raw", (rawWS) => this.manager.updateVoiceState(rawWS));
    this.connect();
  }
  async connect() {
    // node create
    this.manager.on("nodeCreate", async (node) => {
      this.emit("nodes", `${node.options.identifier} has been created.`);
    });
    // node connect
    this.manager.on("nodeConnect", async (node) => {
      this.emit(
        "nodes",
        "Lavalink node has been connected to " + node.options.identifier
      );
    });

    // node disconnect
    this.manager.on("nodeDisconnect", async (node) => {
      this.emit(
        "nodes",
        `${node.options.identifier} has been disconnected, trying to reconnecting...`
      );
    });
    // node reconnect
    this.manager.on("nodeReconnect", async (node) => {
      this.emit("nodes", `${node.options.identifier} is been reconnecting...`);
    });

    // node error
    this.manager.on("nodeError", async (node) => {
      this.emit(
        "nodes",
        `${node.options.identifier} has been encountered an error.`
      );
    });
    this.manager.on("trackStart", async (player, track) => {
      this.emit("playSong", player, track);
    });

    this.manager.on("playerMove", async (player, oldChannel, newChannel) => {
      this.emit("playerMove", player, oldChannel, newChannel);
    });

    this.manager.on("playerCreate", async (player) => {
      this.emit("joined", player);
    });

    this.manager.on("playerDestroy", async (player) => {
      this.emit("disconnect", player);
    });

    this.manager.on("queueEnd", async (player) => {
      this.emit("finish", player);
    });

    this.manager.on("trackEnd", (player, track, payload) => {
      this.emit("finishSong", player, track);
    });
    this.manager.on("trackError", (player, track) => {
      this.emit("error", player, track);
    });

    this.manager.on("trackStuck", (player, track) => {
      this.emit("deleteQueue", player, track);
    });
    this.manager.on("socketClosed", (player, data) => {
      if (data.byRemote === true) {
        player.destroy();
      }
    });

    this.client.on("voiceStateUpdate", async (oS, nS) => {
      if (
        nS.channelId &&
        nS.channel.type == "GUILD_STAGE_VOICE" &&
        nS.guild.me.voice.suppress
      ) {
        if (
          nS.guild.me.permissions.has("SPEAK") ||
          (nS.channel && nS.channel.permissionsFor(nS.guild.me).has("SPEAK"))
        ) {
          nS.guild.me.voice.setSuppressed(false).catch(() => {});
        }
      }
    });
  }
  /**
   *
   * @param {String[]} id Client ID
   */
  async init(id) {
    this.manager.init(id);
  }
  /**
   *
   * @param {Message} message
   * @param {String[]} quary
   * @param {import("../types").playOptions} options
   */
  async play(message, quary, options = {}) {
    let voiceChannel = message.member.voice.channel;
    let player = this.manager.players.get(message.guild.id);
    if (!player) {
      player = this.manager.create({
        guild: message.guild.id,
        textChannel: message.channel.id,
        selfDeafen: options.selfDeaf,
        selfMute: options.selfMute,
        voiceChannel: voiceChannel.id,
        volume: options.volume,
      });
    }

    if (player.state !== "CONNECTED") await player.connect();
    player.set("autoplay", false);

    let res;
    try {
      res = await player.search(quary, message.author);
      if (res.loadType === "LOAD_FAILED") {
        if (!player.queue.current) await player.destroy();
        let error = res.exception;
        this.emit("searchFailed", player, quary, error);
      }
    } catch (e) {
      console.log(e);
    }
    switch (res.loadType) {
      case "NO_MATCHES":
        this.emit("searchNoResult", player, quary);
        if (!player.queue.current) await player.destroy();
        break;
      case "TRACK_LOADED":
        var track = res.tracks[0];
        await player.queue.add(track);
        this.emit("addSong", player, track);
        if (!player.playing && !player.paused && !player.queue.current) {
          await player.play().catch((e) => {
            console.log(e);
          });
        }
        break;
      case "PLAYLIST_LOADED":
        var playlist = res.tracks;
        await player.queue.add(playlist);
        this.emit("addList", player, playlist);
        if (
          !player.playing &&
          !player.paused &&
          player.queue.totalSize === res.tracks.length
        ) {
          await player.play().catch((e) => {
            console.log(e);
          });
        }
        break;
      case "SEARCH_RESULT":
        var track = res.tracks[0];
        await player.queue.add(track);
        this.emit("searchResult", player, res.tracks, quary);
        if (!player.playing && !player.paused && !player.queue.size) {
          await player.play().catch((e) => {
            console.log(e);
          });
        }
        break;
      case "NO_MATCHES":
        this.emit("searchNoResult", player, quary);
        break;
      default:
        break;
    }
  }

  // add related

  /**
   *
   * @param {Message} message
   */
  async addRelatedSong(message) {
    let player = this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing I Can't Add`);
    }
    let quary = player.queue.current.title;
    let res;
    try {
      res = await player.search(quary, message.author);
      if (res.loadType === "LOAD_FAILED") {
        if (!player.queue.current) await player.destroy();
        let error = res.exception;
        this.emit("searchFailed", player, quary, error);
      }
    } catch (e) {
      console.log(e);
    }
    switch (res.loadType) {
      case "NO_MATCHES":
        this.emit("searchNoResult", player, quary);
        if (!player.queue.current) await player.destroy();
        break;
      case "TRACK_LOADED":
        var track = res.tracks[0];
        await player.queue.add(track);
        this.emit("addSong", player, track);
        break;
      case "SEARCH_RESULT":
        var track = res.tracks[0];
        await player.queue.add(track);
        this.emit("searchResult", player, track, quary);
        break;
      case "NO_MATCHES":
        this.emit("searchNoResult", player, quary);
        break;
      default:
        break;
    }
  }
  // Queue
  /**
   *
   * @param {Message} message
   */
  async getQueue(message) {
    let player = this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing I Can't Add`);
    }
    return player.queue;
  }

  // Search
  /**
   *
   * @param {Message} message Message Class From Discord.js
   * @param {String[]} quary String
   */
  async search(message, quary) {
    let res = await this.manager.search(quary, message.author);
    let result;
    if (res.loadType === "SEARCH_RESULT") {
      result = res.tracks.slice(
        options.limit ? options.limit : 10,
        res.tracks.length - 1
      );
    } else {
      return [];
    }

    return result;
  }

  /**
   *
   * @param {Message} message Message Class From Discord.js
   * @param {import("../types").trackResolve} options String
   */
  async trackResolve(message, options = {}) {
    const unresolvedTrack = TrackUtils.buildUnresolved(
      {
        title: options.title,
        url: options.url,
      },
      message.author
    );
    return unresolvedTrack;
  }

  // Search
  /**
   *
   * @param {Message} message Message Class From Discord.js
   * @param {String[]} quary String
   */
  async searchPlaylist(message, quary) {
    let res = await this.manager.search(quary, message.author);
    let result;
    if (res.loadType === "PLAYLIST_LOADED") {
      result = res.playlist;
    } else {
      return [];
    }

    return result;
  }
  // pause
  /**
   *
   * @param {Message} message
   */
  async pause(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (player.paused) {
      throw new Error(`Player Already Paused`);
    } else {
      await player.pause(true);
    }
  }
  // resume
  /**
   *
   * @param {Message} message
   */
  async resume(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.paused) {
      throw new Error(`Player Already Resumed`);
    } else {
      await player.pause(false);
    }
  }

  // stop
  /**
   *
   * @param {Message} message
   */
  async stop(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    }
    let autoplay = player.get("autoplay");
    if (autoplay === true) {
      player.set("autoplay", false);
    } else {
      if (player.queue.current) {
        player.stop();
        player.destroy();
      } else {
        player.destroy();
      }
    }
  }

  /**
   *
   * @param {Message} message
   */
  async skip(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    }
    let autoplay = player.get("autoplay");
    if (autoplay === false) {
      player.stop();
    } else {
      if (player.queue.current) {
        player.stop();
      } else {
        player.set("autoplay", false);
        player.queue.clear();
        player.destroy();
      }
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Number} songIndex
   */
  async skipTo(message, songIndex) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!songIndex || isNaN(songIndex)) {
      throw new Error(`Please Provide Song Index Number`);
    } else {
      let pos = Number(songIndex);
      if (pos < 0 || pos > player.queue.size) {
        throw new Error(`Provided track position is invalid.`);
      } else {
        await player.queue.remove(0, pos - 1);
        player.stop();
      }
    }
  }

  /**
   *
   * @param {Message} message
   * @param {String[]} loopType
   */
  async loop(message, loopType) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else {
      switch (loopType) {
        case "track":
          player.setTrackRepeat(!player.trackRepeat);
          var isRepeat = player.trackRepeat ? true : false;
          return isRepeat;
          break;
        case "queue":
          player.setQueueRepeat(!player.queueRepeat);
          var isRepeat = player.queueRepeat ? true : false;
          return isRepeat;
          break;
        case "off":
          player.setTrackRepeat(false);
          player.setQueueRepeat(false);
          var isRepeat =
            player.trackRepeat || player.queueRepeat ? true : false;
          return isRepeat;
          break;
      }
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Number} time
   */
  async forward(message, time) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!time || isNaN(time)) {
      throw new Error(`Please Provide Time`);
    } else {
      let seekTime = Number(player.position) + Number(time) * 1000;
      if (Number(time) <= 0) {
        seekTime = player.position;
      } else if (seekTime >= player.queue.current.duration) {
        seekTime = player.queue.current.duration - 1000;
      } else {
        player.seek(seekTime);
        return Number(seekTime);
      }
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Number} time
   */
  async rewind(message, time) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!time || isNaN(time)) {
      throw new Error(`Please Provide Time`);
    } else {
      let seekTime = Number(player.position) - Number(time) * 1000;
      if (Number(time) <= 0) {
        seekTime = player.position;
      } else if (seekTime >= player.queue.current.duration || seekTime < 0) {
        seekTime = 0;
      } else {
        player.seek(seekTime);
        return Number(seekTime);
      }
    }
  }

  /**
   *
   * @param {Message} message
   */
  async replay(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else {
      player.seek(0);
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Number} time
   */
  async seek(message, time) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!time || isNaN(time)) {
      throw new Error(`Please Provide Time`);
    } else {
      let t = time * 1000;
      let pos = player.position;
      let duration = player.queue.current.duration;

      if (t <= duration) {
        if (t > pos) {
          player.seek(t);
        } else {
          player.seek(t);
        }
      }
      return Number(t);
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Number} songIndex
   */
  async remove(message, songIndex) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!songIndex || isNaN(songIndex)) {
      throw new Error(`Please Provide Song Index Number`);
    } else {
      let pos = Number(songIndex) - 1;
      if (pos < 0 || pos > player.queue.size) {
        throw new RangeError(`Provided track is Not in Queue.`);
      } else {
        await player.queue.remove(pos);
        return pos;
      }
    }
  }

  /**
   *
   * @param {Message} message
   */
  async removeDuplicates(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.queue.size) {
      throw new Error(`Queue is Empty`);
    } else {
      let tracks = player.queue;
      let newTracks = [];
      let exists;

      for (let i = 0; i < tracks.length; i++) {
        exists = false;
        for (let j = 0; j < newTracks.length; j++) {
          if (tracks[i].uri === newTracks[j].uri) {
            exists = tracks;
            break;
          }
        }
        if (!exists) newTracks.push(newTracks[i]);
      }

      player.queue.clear();
      for (const track of newTracks) {
        player.queue.add(tracks);
        return newTracks.length;
      }
    }
  }

  /**
   *
   * @param {Message} message
   */
  async clearQueue(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.queue.size) {
      throw new Error(`Queue is Empty`);
    } else {
      let queulen = player.queue.length;
      await player.queue.clear();
      return queulen;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async shuffle(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.queue.size) {
      throw new Error(`Queue is Empty`);
    } else {
      player.set(
        "beforeshuffle",
        player.queue.map((t) => t)
      );
      player.queue.shuffle();
      let len = player.queue.length;
      return len ? len : 1;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async unshuffle(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.queue.size) {
      throw new Error(`Queue is Empty`);
    } else {
      player.queue.clear();
      for (const track of player.get("beforeshuffle")) player.queue.add(track);
      let len = player.queue.length;
      return len ? len : 1;
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Number} percent
   */
  async setVolume(message, percent) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!percent || isNaN(percent)) {
      throw new Error(`Volume level must be an integer.`);
    } else {
      let vol = Number(percent);
      player.setVolume(vol);
    }
  }

  /**
   *
   * @param {Message} message
   */
  async addPrevious(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.queue.previous) {
      throw new Error(`No Previous Song`);
    } else {
      let res;
      try {
        res = await player.search(player.queue.previous.uri, message.author);
        if (res.loadType === "LOAD_FAILED") {
          let error = res.exception;
          this.emit("searchFailed", (player, error));
          if (!player.queue.current) await player.destroy();
          throw res.exception;
        }
      } catch (e) {
        console.log(e);
      }

      await player.queue.add(res.tracks[0]);
    }
  }

  /**
   *
   * @param {Message} message
   */
  async playPrevious(message) {
    let player = await this.manager.players.get(message.guild.id);
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else if (!player.queue.previous) {
      throw new Error(`No Previous Song`);
    } else {
      let res;
      try {
        res = await player.search(player.queue.previous.uri, message.author);
        if (res.loadType === "LOAD_FAILED") {
          let error = res.exception;
          this.emit("searchFailed", (player, error));
          if (!player.queue.current) await player.destroy();
          throw res.exception;
        }
      } catch (e) {
        console.log(e);
      }

      await player.queue.add(res.tracks[0]);
      player.stop();
      await player.play();
    }
  }

  /**
   *
   * @param {Message} message
   * @param {Boolean} state
   */
  async setAutoPlay(message, state) {
    let player = await this.manager.players.get(message.guild.id);
    let autoplay = player.get("autoplay");
    if (!player) {
      throw new Error(`Nothing Playing`);
    } else {
      if (state === true) {
        let identifier = player.queue.current.identifier;
        player.set("autoplay", true);
        player.set("requester", message.author);
        player.set("identifier", identifier);
        let search = `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`;
        let res = player.search(search, message.author);
        player.queue.add(res.tracks[1]);

        return true;
      } else {
        player.set("autoplay", false);
        player.queue.clear();

        return false;
      }
    }
  }

  /**
   *
   * @param {Message} message
   * @param {VoiceChannel} voiceChannel
   */
  async join(message, voiceChannel) {
    if (voiceChannel) {
      let player = this.manager.create({
        guild: message.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: message.channel.id,
        volume: 100,
        selfDeafen: true,
        selfMute: false,
      });

      if (player.state !== "CONNECTED") player.connect();
    } else {
      let player = this.manager.create({
        guild: message.guild.id,
        voiceChannel: message.member.voice.channel.id,
        textChannel: message.channel.id,
        volume: 100,
        selfDeafen: true,
        selfMute: false,
      });

      if (player.state !== "CONNECTED") player.connect();
    }
  }

  /**
   *
   * @param {Message} message
   */
  async leave(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`I AM Not Playing`);
    } else {
      if (player.state === "CONNECTED") await player.destroy();
    }
  }

  /**
   *
   * @param {Message} message message from Message Event
   * @param {String[]} trackTitle Name of Song
   */
  async getLyrics(message, trackTitle) {
    let player = await this.manager.players.get(message.guildId);
    if (!trackTitle) {
      trackTitle = player.queue.current.title;
    } else {
      return new Promise((res, rej) => {
        fetch(
          `https://some-random-api.ml/lyrics?title=${encodeURIComponent(
            trackTitle
          )}`
        )
          .then((r) => r.json())
          .then((j) => {
            res(j);
          })
          .catch((e) => {
            rej(e);
          });
      });
    }
  }

  // -------------------------------- filters start ------------------------------------
  /**
   *
   * @param {Message} message
   * @param  {...any} [bandsArray] Array of bands, can be push types too
   */
  async setEQ(message, ...bandsArray) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.setEQ(...bandsArray);
    }
  }

  /**
   *
   * @param {Message} message
   */
  async removeEQ(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.clearEQ();
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setBassboost(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.bassboost != player.bassboost;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setBass(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.bass != player.bass;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setBassboostHigh(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.bassboostHigh = !player.bassboostHigh;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setClassical(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.classical != player.classical;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setTeightd(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.eightd != player.eightd;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setElectronic(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.electronic != player.electronic;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setErrape(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.errape != player.errape;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setGaming(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.gaming != player.gaming;
    }
  }

  /**
   *
   * @param {Message} message
   */
  async setHighfull(message) {
    let player = await this.manager.players.get(message.guildId);
    if (!player) {
      throw new Error(`No track is been playing.`);
    } else {
      player.highfull != player.highfull;
    }
  }
}

module.exports = LavaPlayer;
