import { DataBuffer } from "./DataBuffer";
import { HeaderConstants } from "./HeaderConstants";
import WebSocket from 'ws';

export class IrinaGame {
    
}

export type GameListFilterFlags = {
    started?: boolean,
    others?: boolean,
    common?: boolean
}
export function getGameList(filters: GameListFilterFlags = {started: true}): Promise<IrinaGame[] | null> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket("wss://irinabot.ru/ghost/");
        ws.binaryType = "arraybuffer";
        ws.onopen = ( event: any ) => {
            const requestData = new DataBuffer(new ArrayBuffer(6));
            requestData.putUint8(HeaderConstants.ClientRequest.CONTEXT_HEADER_CONSTANT);
            requestData.putUint8(HeaderConstants.ClientRequest.GET_GAMELIST);
            const filtersNum = (filters.started ? 1 : 0) + (filters.others ? 1 << 1 : 0) + (filters.common ? 1 << 2 : 0);
            requestData.putUint32(filtersNum);

            ws.send(requestData.toArrayBuffer());
        }

        ws.onerror = ( error: any ) => {
            reject(error);
            ws.close();
        }

        ws.onclose = ( closeEvent ) => {
            reject(closeEvent);
        }

        ws.onmessage = ( msg: any ) => {
            resolve(msg as any);
        }
    });
}