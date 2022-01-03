# DiscoDJ

A Discord.js module to simplify your music commands and play songs with audio filters on Discord

[DiscoDJ Support Server](https://discord.gg/PcUVWApWN3)

## Installation

### Install **[discodj](https://npmjs.com/package/discodj)**

```sh
$ npm install --save discodj
```

### Install **[@discordjs/opus](https://npmjs.com/package/@discordjs/opus)**

```sh
$ npm install --save @discordjs/opus
```

### Requirement

- Node v16 or higher
- [discord.js](https://discord.js.org) v12 or **v13 _(Recommended)_**
- [@discordjs/voice](https://github.com/discordjs/voice)
- [FFmpeg](https://www.ffmpeg.org/download.html)
- [@discordjs/opus](https://github.com/discordjs/opus)
- [sodium](https://www.npmjs.com/package/sodium) or [libsodium-wrappers](https://www.npmjs.com/package/libsodium-wrappers)

# Features

- Support `Discord.js V13`
- Simple & easy to use 🤘
- Beginner friendly 😱
- Audio filters 🎸
- Lightweight ☁️
- Multiple sources support ✌
- Play in multiple servers at the same time 🚗
- Does not inject anything to discord.js or your discord.js client 💉
- Allows you to have full control over what is going to be streamed 👑
- Support YouTube, SoundCloud, Facebook, Apple , Dizer and more....
- Autoplay related songs
- Best High Qaulity Music

# EXAMPLE CODE

```js
const { Client, MessageEmbed } = require("discord.js");
const { LavaPlayer } = require("discodj");

const client = new Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "GUILD_MEMBERS"],
});
let player = new LavaPlayer(client, {
  host: "lava.nkno.site", // Your lavalink host name
  port: 443, // Your lavalink host port
  leaveOnEmpty: true, // if you want when song stop bot also leave vc
  password: "LAVA", // Your lava host password ... more options
});

client.on("ready", async () => {
  console.log(`i am online bro`);
});
// checking node connection
player.on("nodes", (node) => {
  console.log(node);
});

// emit when song start
player.on("playSong", async (player, track) => {
  console.log(`Playing ${track.title}`);
});

// emit when player joined vc
player.on("joined", async (player) => {
  console.log(`Joined Voice Channel`);
});

// emit when song added
player.on("addSong", async (player, track) => {
  console.log(`Added ${track.title}`);
});

// emit when playlist added
player.on("addList", async (player, playlist) => {
  console.log(`Added ${track.title}`);
});

// emit when bot disconnect form vc
player.on("disconnect", async (player) => {
  console.log(`I Left VC`);
});

// emit when player move channel
player.on("playerMove", async (player, oldChannel, newChannel) => {
  console.log(`I Switched ${oldChannel.name} to ${newChannel.name}`);
});

// emit when queue end
player.on("finish", async (player) => {
  console.log(`Queue ended...`);
});

// emit when song end
player.on("finishSong", async (player, track) => {
  console.log(`Ended ${track.title}`);
});

// emit when search failed
player.on("searchFailed", async (player, quary, error) => {
  console.log(`Search Failed ${quary}`);
});

// emit when got error
player.on("error", async (player, track) => {
  console.log(`Got error`);
});

// emit when queue stuck and deleted
player.on("deleteQueue", async (player, track) => {
  console.log(`Queue Deleted`);
});
// emit when search not found
player.on("searchNoResult", async (player, quary) => {
  console.log(`Nothing found for ${quary}`);
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  let prefix = "?";
  let args = message.content.slice(prefix.length).trim().split(/ +/);
  let cmd = args.shift()?.toLowerCase();
  let { channel } = message.member.voice;
  switch (cmd) {
    case "play":
      {
        if (!channel) return message.reply(`Please Join VC`);
        let song = args.join(" ");
        if (!song) return message.reply(`Please Give Song`);
        player.play(message, song).catch((e) => console.log(e));
      }
      break;
    case "skip":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .skip(message)
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Song Skiped`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          })
          .catch((e) => {});
      }
      break;
    case "stop":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .stop(message)
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Song Stoped`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          })
          .catch((e) => {});
      }
      break;
    case "pause":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .pause(message)
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Song Paused`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          })
          .catch((e) => {});
      }
      break;
    case "resume":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .resume(message)
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Song Resumed`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          })
          .catch((e) => {});
      }
      break;
    case "replay":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .replay(message)
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Replaying Song`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          })
          .catch((e) => {});
      }
      break;
    case "playprevious":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .playPrevious(message)
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Playing Previous Song`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          })
          .catch((e) => {});
      }
      break;
    case "volume":
      {
        if (!channel) return message.reply(`Please Join VC`);
        let volume = parseInt(args[0]);
        player.setVolume(message, volume).then((msg) => {
          message.reply({
            embeds: [
              new MessageEmbed()
                .setColor("BLURPLE")
                .setTitle(`Volume set to ${volume}%`)
                .setFooter({
                  text: `Coded By Tech Boy Gaming`,
                  iconURL: message.guild.iconURL({ dynamic: true }),
                }),
            ],
          });
        });
      }
      break;
    case "loop":
      {
        if (!channel) return message.reply(`Please Join VC`);
        player
          .loop(message, "track") // types track , queue , off
          .then((msg) => {
            message.reply({
              embeds: [
                new MessageEmbed()
                  .setColor("BLURPLE")
                  .setTitle(`Loop Enabled`)
                  .setFooter({
                    text: `Coded By Tech Boy Gaming`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                  }),
              ],
            });
          });
      }
      break;
    case "queue":
      {
        if (!channel) return message.reply(`Please Join VC`);
        let queue = await player.getQueue(message);
        let string = queue.map((track, index) => {
          return `\`${index + 1}\` ** [${track.title}](${
            track.uri
          })** Requested By ${track.requester}`;
        });
        message.channel.send({
          embeds: [
            new MessageEmbed()
              .setColor("BLURPLE")
              .setTitle(`Queue of ${message.guild.name}`)
              .setDescription(string.join("\n").substr(0, 3000))
              .setFooter({
                text: `Coded By Tech Boy Gaming`,
                iconURL: message.guild.iconURL({ dynamic: true }),
              }),
          ],
        });
      }
      break;
    default:
      break;
  }
});
```
