export const HeaderConstants = {
    ClientRequest: {
        CONTEXT_HEADER_CONSTANT: 0x00,
        SEND_ERROR: 0x00,
        PING: 0x02,
        GET_GAMELIST: 0x01,
        GET_MAPINFO: 0x0d, 
        RESOLVE_CONNECTOR_IDS: 0x13,
    },
    ServerAnswer: {
        CONTEXT_HEADER_CONSTANT: 0x00,
        GET_ERROR: 0x00,
        PONG: 0x02,
        GAMELIST: 0x01,
        MAPINFO: 0x0d,
        RESOLVE_CONNECTOR_IDS: 0x13,
    },

}