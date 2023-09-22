"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameList = exports.getMapInfo = exports.flagsIntegerToGameFlags = void 0;
const DataBuffer_1 = require("./DataBuffer");
const HeaderConstants_1 = require("./HeaderConstants");
const ws_1 = __importDefault(require("ws"));
function flagsIntegerToGameFlags(flags) {
    const started = (flags & 1) > 0;
    const hasPassword = (flags & 2) > 0;
    const hasGamePowerUp = (flags & 4) > 0;
    const hasOtherGame = (flags & 8) > 0;
    let flagsInteger = 0;
    if (started)
        flagsInteger |= 1;
    if (hasPassword)
        flagsInteger |= 2;
    if (hasGamePowerUp)
        flagsInteger |= 4;
    if (hasOtherGame)
        flagsInteger |= 8;
    return { started: started, hasPassword: hasPassword, hasGamePowerUp: hasGamePowerUp, hasOtherGame: hasOtherGame, flagsInteger: flagsInteger };
}
exports.flagsIntegerToGameFlags = flagsIntegerToGameFlags;
const getMapInfoAPIURL = "https://api.irinabot.ru/v1/maps";
function getMapInfo(mapId) {
    return new Promise(async (resolve, reject) => {
        const request = await fetch(`${getMapInfoAPIURL}/${mapId}`);
        let answer = await request.json();
        if (answer?.code == 40002) {
            answer = {
                mapId: mapId,
                success: false,
                fileName: null,
                fileSize: null,
                downloadUrl: null,
                shortTag: null,
                lastUpdateDate: null,
                creationDate: null,
                categories: null,
                mapInfo: null,
                additionalFlags: null,
                configs: null,
                verified: null,
                semanticCheckError: null,
                owner: null,
                favorite: null,
            };
        }
        answer.lastUpdateDate = new Date(answer.lastUpdateDate);
        answer.creationDate = new Date(answer.creationDate);
        answer.configs.forEach(config => {
            config.creationDate = new Date(config.creationDate);
            config.lastUpdateDate = new Date(config.lastUpdateDate);
        });
        resolve(answer);
    });
}
exports.getMapInfo = getMapInfo;
function getGameList(filters = { started: true, others: true, common: true }) {
    return new Promise((resolve, reject) => {
        const ws = new ws_1.default("wss://irinabot.ru/ghost/");
        ws.binaryType = "arraybuffer";
        ws.onopen = (event) => {
            const requestData = new DataBuffer_1.DataBuffer(new ArrayBuffer(6));
            requestData.putUint8(HeaderConstants_1.HeaderConstants.ClientRequest.CONTEXT_HEADER_CONSTANT);
            requestData.putUint8(HeaderConstants_1.HeaderConstants.ClientRequest.GET_GAMELIST);
            const filtersNum = (filters.started ? 1 : 0) + (filters.others ? 1 << 1 : 0) + (filters.common ? 1 << 2 : 0);
            requestData.putUint32(filtersNum);
            ws.send(requestData.toArrayBuffer());
        };
        ws.onerror = (error) => {
            reject(error);
            ws.close();
        };
        ws.onmessage = (msg) => {
            const data = new DataBuffer_1.DataBuffer(msg.data);
            const firstHeader = data.getUint8();
            const secondHeader = data.getUint8();
            if (secondHeader != HeaderConstants_1.HeaderConstants.ServerAnswer.GAMELIST || firstHeader != HeaderConstants_1.HeaderConstants.ServerAnswer.CONTEXT_HEADER_CONSTANT)
                return;
            const gamesLength = data.getUint16();
            const irinaGames = new Array(gamesLength);
            for (let i = 0; i < gamesLength; ++i) {
                const name = data.getNullTerminatedString();
                const flags = flagsIntegerToGameFlags(data.getUint16());
                const gameVersion = data.getNullTerminatedString();
                const mapId = data.getUint32();
                const gamePosition = data.getUint8();
                const gameId = data.getUint32();
                const gameTicks = data.getUint32();
                const creatorId = data.getUint32();
                const iccupHost = data.getNullTerminatedString();
                const maxPlayers = data.getUint8();
                const orderId = data.getUint32();
                const playersCount = data.getUint8();
                const players = new Array(playersCount);
                for (let j = 0; j < playersCount; ++j)
                    players.push({ colour: data.getUint8(), name: data.getNullTerminatedString(), realm: data.getNullTerminatedString(), comment: data.getNullTerminatedString() });
                irinaGames.push({
                    name: name,
                    gameFlags: flags,
                    gameVersion: gameVersion,
                    mapId: mapId,
                    gamePosition: gamePosition,
                    gameId: gameId,
                    gameTicks: gameTicks,
                    creatorId: creatorId,
                    iccupHost: iccupHost,
                    maxPlayers: maxPlayers,
                    orderId: orderId,
                    playersCount: playersCount,
                    players: players,
                    getMapInfo: (() => { return getMapInfo(mapId); }),
                });
            }
            resolve(irinaGames);
        };
    });
}
exports.getGameList = getGameList;
