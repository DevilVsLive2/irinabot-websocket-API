"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameList = exports.IrinaGame = void 0;
const DataBuffer_1 = require("./DataBuffer");
const HeaderConstants_1 = require("./HeaderConstants");
const ws_1 = __importDefault(require("ws"));
class IrinaGame {
}
exports.IrinaGame = IrinaGame;
function getGameList(filters = { started: true }) {
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
        ws.onclose = (closeEvent) => {
            reject(closeEvent);
        };
        ws.onmessage = (msg) => {
            resolve(msg);
        };
    });
}
exports.getGameList = getGameList;
