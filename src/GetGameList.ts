import { DataBuffer } from "./DataBuffer";
import { HeaderConstants } from "./HeaderConstants";
import WebSocket from 'ws';

export type Player = {
    colour: number,
    name: string,
    realm: string,
    comment: string,
}

export type MapInfo = {
    success: boolean,
    code?: number,
    mapId: number,
    fileName: string,
    fileSize: number,
    downloadUrl: string,
    shortTag: string,
    lastUpdateDate: Date,
    creationDate: Date,
    categories: number[],
    mapInfo: {
        name: string,
        description: string,
        playerRecommendation: string,
        author: string,
        coverImageUrl: string | null,
        mapImageUrl: string,
        numPlayers: number,
    },
    additionalFlags: { },
    configs: {
        version: string,
        status: number,
        lastUpdateDate: Date,
        creationDate: Date,
        owner: boolean,
    }[],
    verified: boolean,
    semanticCheckError: boolean,
    owner: string | null,
    favorite: boolean,
}

export type IrinaGame = {
    name: string,
    gameFlags: GameFlags,
    gameVersion: string,
    mapId: number,
    gamePosition: number,
    gameId: number,
    gameTicks: number,
    creatorId: number,
    iccupHost: string,
    maxPlayers: number,
    orderId: number,
    playersCount: number,
    players: Player[],
    getMapInfo(): Promise<MapInfo>
}

export type GameFlags = {
    started: boolean,
    hasPassword: boolean,
    hasOtherGame: boolean,
    hasGamePowerUp: boolean,
    flagsInteger: number,
}

export type GameListFilterFlags = {
    started?: boolean,
    others?: boolean,
    common?: boolean
}

export function flagsIntegerToGameFlags ( flags:number ): GameFlags {
    const started = (flags & 1) > 0;
    const hasPassword = (flags & 2) > 0;
    const hasGamePowerUp = ( flags & 4 ) > 0;
    const hasOtherGame = ( flags & 8 ) > 0;
    let flagsInteger = 0;
    if (started) flagsInteger |= 1;
    if (hasPassword) flagsInteger |= 2;
    if (hasGamePowerUp) flagsInteger |= 4;
    if (hasOtherGame) flagsInteger |= 8;

    return { started: started, hasPassword: hasPassword, hasGamePowerUp: hasGamePowerUp, hasOtherGame: hasOtherGame, flagsInteger: flagsInteger };
}

const getMapInfoAPIURL = "https://api.irinabot.ru/v1/maps";

export function getGameList(filters: GameListFilterFlags = {started: true, others: true, common: true}): Promise<IrinaGame[]> {
    return new Promise<IrinaGame[]>((resolve, reject) => {
        const ws = new WebSocket("wss://irinabot.ru/ghost/");
        ws.binaryType = "arraybuffer";
        ws.onopen = ( event ) => {
            const requestData = new DataBuffer(new ArrayBuffer(6));

            requestData.putUint8(HeaderConstants.ClientRequest.CONTEXT_HEADER_CONSTANT);
            requestData.putUint8(HeaderConstants.ClientRequest.GET_GAMELIST);
            const filtersNum = (filters.started ? 1 : 0) + (filters.others ? 1 << 1 : 0) + (filters.common ? 1 << 2 : 0);
            requestData.putUint32(filtersNum);

            ws.send(requestData.toArrayBuffer());
        }

        ws.onerror = ( error ) => {
            reject(error);
            ws.close();
        }

        ws.onmessage = ( msg ) => {
            const data = new DataBuffer(msg.data as ArrayBuffer);
            const firstHeader = data.getUint8();
            const secondHeader = data.getUint8();
            if (secondHeader != HeaderConstants.ServerAnswer.GAMELIST || firstHeader != HeaderConstants.ServerAnswer.CONTEXT_HEADER_CONSTANT) return;

            const gamesLength = data.getUint16();
            const irinaGames:Array<IrinaGame> = new Array(gamesLength);
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
                const players:Array<Player> = new Array(playersCount);
                for (let j = 0; j < playersCount; ++j)
                    players.push( { colour: data.getUint8(), name: data.getNullTerminatedString(), realm: data.getNullTerminatedString(), comment: data.getNullTerminatedString() } );
                const getMapInfo = () => {
                    return new Promise<MapInfo>( async (resolve, reject) => {
                        const request = await fetch(`${getMapInfoAPIURL}/${mapId}`);
                        let answer:MapInfo = await request.json();
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
                            }
                        }
                        resolve(answer);
                    });
                }

                irinaGames.push( {
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
                    getMapInfo: getMapInfo,
                } );
            }

            resolve(irinaGames);
            
        }
    });
}