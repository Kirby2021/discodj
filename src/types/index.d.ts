export type manangerOptions = {
  host: string; // You lavalink host URL either IP
  port: number; // Port of the network lavalink
  password: string; // Connection auth password
  retryDelay: number; // [Optional] You can set delay of the retry to connect
  retryAmount: number; // [Optional] How much times bot will be request to connect
  leaveOnEmpty: boolean; // Check, does bot will leave on empty either will stay
  isHttps: boolean; // Is it secure connection? HTTP / FTP / IP = false, HTTPS / SFTP = true
  spotifyClientID: string; // Put your spotify client OD
  spotifyClientSecret: string; // Put your spotify ckuebt secr
};

export type playOptions = {
  skip: boolean; // You lavalink host URL either IP
  volume: number;
  selfDeaf: boolean;
  selfMute: boolean;
};

export type trackResolve = {
  title: string;
  url: string;
};
