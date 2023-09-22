import { DataBuffer } from "./DataBuffer";
import { HeaderConstants } from "./HeaderConstants";

export function connectorIdsToNicks(...connectorIds:number[]) : Promise<{connectorIds: {[ key: number ]: string}}> {
    return new Promise<{connectorIds: {[ key: number ]: string}}>( (resolve, reject) => {
        const ws = new WebSocket("wss://irinabot.ru/ghost/");
        ws.binaryType = "arraybuffer";
        const results:{connectorIds: {[ key: number ]: string}} ={ connectorIds: {} };
        ws.onopen = ( event ) => {
            const requestData = new DataBuffer(new ArrayBuffer(6));

            requestData.putUint8(HeaderConstants.ClientRequest.CONTEXT_HEADER_CONSTANT);
            requestData.putUint8(HeaderConstants.ClientRequest.RESOLVE_CONNECTOR_IDS);
            requestData.putUint16(connectorIds.length);

            connectorIds.forEach(connectorId => {
                requestData.putUint32(connectorId);
            });

            ws.send(requestData.toArrayBuffer());
        }

        ws.onerror = ( error ) => {
            reject(error);
            ws.close();
        }

        ws.onmessage = ( msg ) => {
            const data = new DataBuffer(msg.data);
            
            const firstHeader = data.getUint8();
            const secondHeader = data.getUint8();
            if (firstHeader !== HeaderConstants.ServerAnswer.CONTEXT_HEADER_CONSTANT || secondHeader !== HeaderConstants.ServerAnswer.RESOLVE_CONNECTOR_IDS) return;

            const answerLength = data.getUint32();

            for (let i = 0; i < answerLength; ++i) {
                results.connectorIds[data.getUint32()] = data.getNullTerminatedString();
            } 

            resolve(results);
        }
    });
}