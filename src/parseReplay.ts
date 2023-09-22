import { DataBuffer } from "./DataBuffer";
import fs from "node:fs";

import {inflate, createInflate, constants} from "node:zlib";
import { inflateSync } from "zlib";

export enum RecordIDs {
    AdditionalPlayerRecord = 0x16,
    GameStartRecord = 0x19,
}

export type ReplaySubHeader = {
    unknownNumber?: number
    isClassic?: boolean,
    versionNumber: number,
    buildNumber: number,
    singlePlayer: boolean,
    replayLength: number,
    CRCchecksum: number,
}

export type ReplayHeaders = {
    fileHeader: string,
    fileOffset: 0x44 | 0x40,
    compressedSize: number,
    headerVersion: number,
    decompressedSize: number,
    compressedBlockNumber: number,
    subHeader: ReplaySubHeader,
}

export enum PlayerRaces {
    Human,
    Orc,
    Nightelf,
    Undead,
    Daemon,
    Random,
    SelectableOrFixed
}

export type PlayerRecord = {
    host: boolean,
    slot: number,
    name: string,
    race?: PlayerRaces,
}

export enum GameSpeedSetting {
    Slow,
    Normal,
    Fast,
    Unused,
}

export enum VisibilitySetting {
    Hide,
    Explored,
    Visible,
    Default,
}

export enum ObserversSetting {
    Off,
    Unused,
    OnDefeat,
    On,
    Referees,
}

export enum FixedTeamsSetting {
    Off,
    Unused,
    On,
}

export enum GameType {
    Unknow,
    Ladder,
    Custom,
    Single,
    LadderTeam
}

export type GameSettings = {
    gameSpeed: GameSpeedSetting,
    visibility: VisibilitySetting,
    observers: ObserversSetting,
    teamsTogether: boolean,
    fixedTeams: FixedTeamsSetting,
    fullSharedUnitControl: boolean,
    randomHero: boolean,
    randomRaces: boolean,
    mapChecksum: number,
    mapPath: string,
    creatorName: string,
    playerCount: number,
    gameType: GameType,
    private: boolean,
    languageId: number
}

export enum SlotStatus {
    Empty,
    Closed,
    Used,
}

export enum AIStrength {
    Easy,
    Normal,
    Insane,
}

export type SlotRecord = {
    slotStatus: SlotStatus,
    isHuman: boolean,
    teamNumber: number,
    color: number,
    race: PlayerRaces,
    handicap: number,
    AIstrength?: AIStrength,
}

export enum SelectMode {
    TeamAndRaceSelectable,
    TeamNotSelectable,
    TeamAndRaceNotSelectable,
    RaceFixedToRandom,
    AutomatedMatchMaking,
}

export type GameStartRecord = {
    slotRecordsNumber: number,
    slotRecord: { playerId: number, record: SlotRecord }[],
    randomSeed: number,
    selectMode: SelectMode,
    startSpotCount: number,
}

interface Block {
    id: number,
}

export enum LeaveReasons {
    ConnectionClosedByRemoteGame,
    ConnectionClosedByLocalGame,
    Unknown
}

//TODO: какого черта там нахуй написано, надо будет разобраться
export enum LeaveTypes {
    disconnected,
    left,
    lost,
    won,
    draw,
    leftAsObserver,
    replaySaverDisconnected,

}

export interface LeaveBlock extends Block {
    id: 0x17,
    reason: LeaveReasons,
    playerId: number,
    leaveType: LeaveTypes,
    unknown: number,
}

//TODO: глянуть в w3g_actions.txt и заполнить это дело
export type CommandData = {

}

export interface TimeSlotBlock extends Block {
    id: 0x1E | 0x1F,
    length: number, 
    timeIncrement: number,
    commandData: {playerId: number, actionBlockLength: number, action: CommandData},
}

export interface PlayerChatMessageBlock extends Block {
    playerId: number,

}

type Blocks = TimeSlotBlock;

export enum ActionTypes {
    leave,
    win,
    disconnect,
    sendMessage,

}

export type Action = {
    actionType: ActionTypes,
    
}

export type BlocksData = {
    players: PlayerRecord[],
    gameName: string,
    gameSettings: GameSettings,
    gameStartRecord: GameStartRecord,
    blocks: Blocks[],
}

export type ReplayData = {
    headers: ReplayHeaders,
    gameName: string,
    players: PlayerRecord[],
    playerActions: { playerData: PlayerRecord, actions: Action[] }[],
    gameSettings: GameSettings,
    gameStartRecord: GameStartRecord,
}

function isKthBitSet(number: number, bitIndex: number) {
    return (number & (1 << bitIndex)) > 0
}

export class ReplayParser {

    private _replayFileName: string;
    private _replayDataBuffer: DataBuffer;

    public readonly replayHeader:ReplayHeaders;
    public readonly replaySubHeader:ReplaySubHeader;


    private parseSubHeader(dataBuffer: DataBuffer, headerVersion: number) : ReplaySubHeader {
        const subHeader:ReplaySubHeader = undefined;
        if (headerVersion == 0x00) {
            subHeader.unknownNumber = dataBuffer.getUint16();
            subHeader.versionNumber = dataBuffer.getUint16();
            subHeader.buildNumber = dataBuffer.getUint16();
            subHeader.singlePlayer = dataBuffer.getUint16() != 0x8000;
            subHeader.replayLength = dataBuffer.getUint32();
            subHeader.CRCchecksum = dataBuffer.getUint32();
        } else {
            const subHeader:ReplaySubHeader = {
                isClassic: false,
                versionNumber: 0,
                buildNumber: 0,
                singlePlayer: false,
                replayLength: 0,
                CRCchecksum: 0
            };
            const charCodes = dataBuffer.getArray(4);
            let versionIdentifier = "";
            for (const charCode of charCodes) {
                versionIdentifier += String.fromCharCode(charCode);
            }
            subHeader.isClassic = versionIdentifier == "WAR3";
            subHeader.versionNumber = dataBuffer.getUint32();
            subHeader.buildNumber = dataBuffer.getUint16();
            subHeader.singlePlayer = dataBuffer.getUint16() == 0x0000;
            subHeader.replayLength = dataBuffer.getUint32();
            subHeader.CRCchecksum = dataBuffer.getUint32();
            return subHeader;
        }
        return subHeader;
    }

    private parseHeaders(dataBuffer: DataBuffer) : ReplayHeaders {
        const headers:ReplayHeaders = {
            fileHeader: undefined,
            fileOffset: undefined,
            compressedSize: 0,
            headerVersion: 0,
            decompressedSize: 0,
            compressedBlockNumber: 0,
            subHeader: undefined
        }
        headers.fileHeader = dataBuffer.getNullTerminatedString();
        if (!headers.fileHeader.startsWith("Warcraft III recorded game")) {
            headers.fileHeader = undefined;
            return headers;
        } 
        headers.fileOffset = dataBuffer.getUint32() == 0x44 ? 0x44 : 0x40;
        headers.compressedSize = dataBuffer.getUint32();
        headers.headerVersion = dataBuffer.getUint32();
        headers.decompressedSize = dataBuffer.getUint32();
        headers.compressedBlockNumber = dataBuffer.getUint32();
        headers.subHeader = this.parseSubHeader(dataBuffer, headers.headerVersion);
        return headers;
    }

    private isHostSet: boolean;

    private parsePlayerRecord(dataBuffer: DataBuffer) : PlayerRecord {
        let response:PlayerRecord = {
            host: undefined,
            slot: undefined,
            name: undefined
        };
        if (!this.isHostSet) {
            response.host = dataBuffer.getUint8() == 0x00;
        } else {
            response.host = false;
        }
        response.slot = dataBuffer.getUint8();
        response.name = dataBuffer.getNullTerminatedString();
        if (dataBuffer.getUint8() == 0x08) {
            const playerRaceIndex = dataBuffer.getUint8();
            response.race = ( 
                playerRaceIndex == 0x01 ? PlayerRaces.Human : 
                playerRaceIndex == 0x02 ? PlayerRaces.Orc : 
                playerRaceIndex == 0x04 ? PlayerRaces.Nightelf : 
                playerRaceIndex == 0x08 ? PlayerRaces.Undead : 
                playerRaceIndex == 0x10 ? PlayerRaces.Daemon : 
                playerRaceIndex == 0x20 ? PlayerRaces.Random : 
                playerRaceIndex == 0x40 ? PlayerRaces.SelectableOrFixed : undefined )
        } else {
            // null byte
            dataBuffer.getUint8();
        }
        return response;
    }
    
    /**
     * 
     * @returns the databuffer that got, with replaced encoded part to decoded.
     */
    private decodeEncodedString (dataBuffer: DataBuffer) : DataBuffer {
        const beforeEncodedString = new DataBuffer(dataBuffer.toArrayBuffer().slice(0, dataBuffer.position));
        const beforeEncodedStringPosition = dataBuffer.position;
        const response = new DataBuffer(new ArrayBuffer(0));

        let currentCharNum:number = dataBuffer.getUint8();
        let decodedChars:number[] = [];
        let pos = 0;
        let mask;
        while (currentCharNum != 0) {
            if (pos%8 == 0) {
                mask = currentCharNum;
            }
            else
            {
                if (!isKthBitSet(mask, pos%8))
                    decodedChars.push(currentCharNum - 1);
                else
                    decodedChars.push(currentCharNum);
            }
            
            currentCharNum = dataBuffer.getUint8();
            pos++;
        }
        response.putByteArray(new Uint8Array(beforeEncodedString.toArrayBuffer()));
        response.putByteArray(decodedChars);
        response.putUint8(currentCharNum); //NULL
        const afterEncodedString = new DataBuffer(dataBuffer.toArrayBuffer().slice(dataBuffer.position));
        response.putByteArray(new Uint8Array(afterEncodedString.toArrayBuffer()));

        response.position = beforeEncodedStringPosition;



        return response;
    }

    private parseGameSettings (decodedGameSettings: DataBuffer) : GameSettings {
        const response:GameSettings = {
            gameSpeed: undefined,
            visibility: undefined,
            observers: undefined,
            teamsTogether: undefined,
            fixedTeams: undefined,
            fullSharedUnitControl: undefined,
            randomHero: undefined,
            randomRaces: undefined,
            mapChecksum: undefined,
            mapPath: undefined,
            creatorName: undefined,
            playerCount: undefined,
            gameType: undefined,
            private: undefined,
            languageId: undefined,
        }

        let flag = decodedGameSettings.getUint8();
        response.gameSpeed = flag == 3 ? GameSpeedSetting.Unused : flag == 2 ? GameSpeedSetting.Fast : flag == 1 ? GameSpeedSetting.Normal : flag == 0 ? GameSpeedSetting.Slow : undefined;
        flag = decodedGameSettings.getUint8();
        response.visibility = isKthBitSet(flag, 3) ? VisibilitySetting.Default : isKthBitSet(flag, 2) ? VisibilitySetting.Visible : isKthBitSet(flag, 1) ? VisibilitySetting.Explored : isKthBitSet(flag, 0) ? VisibilitySetting.Hide : undefined;
        response.observers = (isKthBitSet(flag, 5) && isKthBitSet(flag, 4)) ? ObserversSetting.On : isKthBitSet(flag, 5) ? ObserversSetting.OnDefeat : isKthBitSet(flag, 4) ? ObserversSetting.Unused : ObserversSetting.Off;
        response.teamsTogether = isKthBitSet(flag, 6);
        flag = decodedGameSettings.getUint8();
        response.fixedTeams = (isKthBitSet(flag, 2) && isKthBitSet(flag, 1)) ? FixedTeamsSetting.On : isKthBitSet(flag, 2) ? FixedTeamsSetting.Unused : isKthBitSet(flag, 1) ? FixedTeamsSetting.Unused : FixedTeamsSetting.Off;
        flag = decodedGameSettings.getUint8();
        response.fullSharedUnitControl = isKthBitSet(flag, 0);
        response.randomHero = isKthBitSet(flag, 1);
        response.randomRaces = isKthBitSet(flag, 2);
        if ((response.observers == ObserversSetting.On || response.observers == ObserversSetting.Off) && isKthBitSet(flag, 6)) response.observers = ObserversSetting.Referees;
        //unused bytes
        decodedGameSettings.getArray(5);
        
        response.mapChecksum = decodedGameSettings.getUint32();
        response.mapPath = decodedGameSettings.getNullTerminatedString();
        response.creatorName = decodedGameSettings.getNullTerminatedString();
        decodedGameSettings.getUint8();
        //empty null-terminated string
        decodedGameSettings.getNullTerminatedString();
        //other bytes are unused.

        response.playerCount = decodedGameSettings.getUint32();
        //as I understood, it's works only for patch <1.07, do not use those values for replays that are have patch >= 1.07
        flag = decodedGameSettings.getUint8();
        response.gameType = flag == 0x00 ? GameType.Unknow : flag == 0x01 ? GameType.Ladder : flag == 0x09 ? GameType.Custom : flag == 0x1D ? GameType.Single : flag == 0x20 ? GameType.LadderTeam : undefined;
        flag = decodedGameSettings.getUint8();
        response.private = flag == 0x00 ? false : flag == 0x08 ? true : undefined;
        //null bytes (<1.07 patch only, >=1.07 - unknown bytes.)
        decodedGameSettings.getUint16();
        //not sure, don't recommend to use this too.
        response.languageId = decodedGameSettings.getUint32();


        return response
    }

    private parseGameStartRecord(dataBuffer: DataBuffer) : GameStartRecord {
        const response:GameStartRecord = {
            slotRecordsNumber: undefined,
            slotRecord: [],
            randomSeed: undefined,
            selectMode: undefined,
            startSpotCount: undefined,
        }

        response.slotRecordsNumber = dataBuffer.getUint8();

        for (let i = 0; i < response.slotRecordsNumber; i++) {
            const record:SlotRecord = {
                slotStatus: undefined,
                isHuman: undefined,
                teamNumber: undefined,
                color: undefined,
                race: undefined,
                handicap: undefined,
            }
            const playerId = dataBuffer.getUint8();
            //map download percent, 100 in custom, 255 in ladder (obviosly map will be downloaded, no need to add it to record)
            dataBuffer.getUint8();
            record.slotStatus = dataBuffer.getUint8();
            record.isHuman = dataBuffer.getUint8() == 0x00;
            record.teamNumber = dataBuffer.getUint8();
            record.color = dataBuffer.getUint8();
            let flag = dataBuffer.getUint8();
            record.race = flag == 0x01 ? PlayerRaces.Human : flag == 0x02 ? PlayerRaces.Orc : flag == 0x04 ? PlayerRaces.Nightelf : flag == 0x08 ? PlayerRaces.Undead : flag == 0x20 ? PlayerRaces.Random : flag == 0x40 ? PlayerRaces.SelectableOrFixed : undefined;
            flag = dataBuffer.getUint8();
            if (!record.isHuman) record.AIstrength = flag;
            record.handicap = dataBuffer.getUint8();
            response.slotRecord.push({
                playerId: playerId,
                record: record,
            });
        }
        response.randomSeed = dataBuffer.getUint32();
        let flag = dataBuffer.getUint8();
        response.selectMode = flag == 0xcc ? SelectMode.AutomatedMatchMaking : flag;
        response.startSpotCount = dataBuffer.getUint8();


        return response;
    }

    private async decompressBlocks(dataBuffer: DataBuffer, compressedBlocksNumber: number) : Promise<BlocksData> {
        const response:BlocksData = {
            players: [],
            gameName: undefined,
            gameSettings: undefined,
            gameStartRecord: undefined,
            blocks: [],
        }

        let decompressedData = new DataBuffer(new ArrayBuffer(0));
        for (let index = 0; index < compressedBlocksNumber; index++) {
            const compressedBlockSize = dataBuffer.getUint16();
            const decompressedBlockSize = dataBuffer.getUint16();
            const checksum = dataBuffer.getUint32();
            const decompressData = dataBuffer.getArray(compressedBlockSize);
            let a = inflateSync(new Uint8Array(decompressData), { flush: constants.Z_SYNC_FLUSH });
            decompressedData.putByteArray(a);
        }
        decompressedData.position = 0;

        //unknow, always set to 0x00000110
        decompressedData.getUint32();
        response.players.push(this.parsePlayerRecord(decompressedData));
        this.isHostSet = true;
        response.gameName = decompressedData.getNullTerminatedString();
        if (decompressedData.getUint8() != 0) decompressedData.position--;
        decompressedData = this.decodeEncodedString(decompressedData);

        response.gameSettings = this.parseGameSettings(decompressedData);
        
        let flag = decompressedData.getUint8();

        while (flag == RecordIDs.AdditionalPlayerRecord) {
            response.players.push(this.parsePlayerRecord(decompressedData));
            //unknown bytes
            decompressedData.getUint32();


            flag = decompressedData.getUint8();
        }
        if (flag != RecordIDs.GameStartRecord) throw new Error("bad replay data!");
        //number of data bytes following
        decompressedData.getUint16();

        response.gameStartRecord = this.parseGameStartRecord(decompressedData);

        
        


        return response;
    }

    public async parseFromDataBuffer(dataBuffer: DataBuffer) : Promise<ReplayData> {
        const headers = this.parseHeaders(dataBuffer);
        const decompressedData = await this.decompressBlocks(dataBuffer, headers.compressedBlockNumber);
        const response = {
            headers: headers,
            gameName: decompressedData.gameName,
            players: decompressedData.players,
            gameSettings: decompressedData.gameSettings,
            gameStartRecord: decompressedData.gameStartRecord,
        };

        return { 
            headers: headers,
            gameName: decompressedData.gameName, 
            players: decompressedData.players, 
            playerActions: [ {playerData: decompressedData.players[0], actions: undefined} ],
            gameSettings: decompressedData.gameSettings,
            gameStartRecord: decompressedData.gameStartRecord,
            };
    }

    public parseFromUrl(url: string) : Promise<ReplayData> {
        return new Promise<ReplayData>(async (resolve, reject) => {
            const request = await fetch(url);
            if (!request.ok) {reject(await request.json()); return;}
            const response = await request.arrayBuffer();
            resolve(await this.parseFromDataBuffer(new DataBuffer(response)));
        });
    }
    public async parseFromFile(filePath: string) : Promise<ReplayData> {
        const dataBuffer = fs.readFileSync(filePath);
        return await this.parseFromDataBuffer(new DataBuffer( dataBuffer.buffer ));
    }
    
}