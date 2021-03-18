import express from "express";
import bodyParser from 'body-parser';
import GeoGuessrSlackBot from './GeoGuessrSlackBot';

export const cookie = process.env.GeoguessrCookie;
const port = process.env.PORT || 5000;

express()
    .use(bodyParser.urlencoded())
    .post('/slack', async (req, res) => await new GeoGuessrSlackBot().onSlashCommand(req, res))
    .listen(port, () => console.log(`Listening on ${port}`));
