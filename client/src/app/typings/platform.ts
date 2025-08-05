import { NextApiResponse } from "next/dist/shared/lib/utils"
import { Socket as NetSocket } from "net";
import { Server as HTTPServer } from "http";
import { Server as IOServer } from "socket.io";

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

export interface SocketServer extends HTTPServer {
  io?: IOServer | undefined
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer
}