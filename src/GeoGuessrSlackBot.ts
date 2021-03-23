import { cookie } from './index';
import AsynchronousSlackBot from './AsynchronousSlackBot';
import fetch from 'node-fetch';

export default class GeoGuessrSlackBot extends AsynchronousSlackBot {
    private _mapAliases: { [alias: string]: string } = {
        'diverse-world': '59a1514f17631e74145b6f47',
        'urban-world': '5b3d510b7a2b425ef47b54fd',
    };

    private _mapId: string | undefined;
    private _roundTimeLimit: number | undefined;
    private _forbidMoving: boolean | undefined;
    private _forbidRotating: boolean | undefined;
    private _forbidZooming: boolean | undefined;

    protected get _name(): string {
        return 'GeoGuessrBot';
    }

    protected _isEnvironmentSetup(): boolean {
        return !!cookie;
    }

    protected _parseParams(params: string[]): void {
        if (!params) {
            throw new Error('Expected command parameters, but got none.');
        }
        if (params.length === 1) {
            this._mapId = params[0];

            this._roundTimeLimit = undefined;
            this._forbidMoving = false;
            this._forbidRotating = false;
            this._forbidZooming = false;
        }
        else if (params.length === 2) {
            this._mapId = params[0];
            this._roundTimeLimit = Number.parseInt(params[1]);
            if (!Number.isInteger(this._roundTimeLimit)) {
                throw new Error(`Invalid timeLimit parameter: "${params[1]}". Expected integer.`);
            }

            this._forbidMoving = false;
            this._forbidRotating = false;
            this._forbidZooming = false;
        }
        else if (params.length === 5) {
            this._mapId = params[0];
            this._roundTimeLimit = Number.parseInt(params[1]);
            if (!Number.isInteger(this._roundTimeLimit)) {
                throw new Error(`Invalid timeLimit parameter: "${params[1]}". Expected integer.`);
            }

            const validBools = ['true', 'false'];
            if (!validBools.includes(params[2]) || !validBools.includes(params[3]) || !validBools.includes(params[4])) {
                throw new Error(`Invalid forbid parameters: "${params[2]} ${params[3]} ${params[4]}". All must be booleans, either "true" or "false".`);
            }
            this._forbidMoving = params[2] === 'true';
            this._forbidRotating = params[3] === 'true';
            this._forbidZooming = params[4] === 'true';
        }
        else {
            throw new Error(`Invalid command parameters: "${params.join(' ')}". Expected either "mapId" (e.g. "59a1514f17631e74145b6f47"), "mapId timeLimit" (e.g. "59a1514f17631e74145b6f47 90"), or "mapId timeLimit forbidMoving forbidRotating forbidZooming (e.g. "59a1514f17631e74145b6f47 60 true false false")`);
        }
    }

    protected async _getResponse(user: string): Promise<{ [key: string]: any }> {
        if (this._mapId === undefined) {
            throw new Error(`No mapId provided.`);
        }

        const map = Object.keys(this._mapAliases).includes(this._mapId) ? this._mapAliases[this._mapId] : this._mapId;
        const timeLimit = this._roundTimeLimit ?? 0;

        const response = await fetch('https://www.geoguessr.com/api/v3/challenges', {
            headers: {
              "accept": "*/*",
              "accept-language": "en,sv;q=0.9,fi;q=0.8,nb;q=0.7",
              "content-type": "application/json",
              "sec-ch-ua": "\"Google Chrome\";v=\"89\", \"Chromium\";v=\"89\", \";Not A Brand\";v=\"99\"",
              "sec-ch-ua-mobile": "?0",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
              "cookie": cookie as string,
            },
            body: JSON.stringify({
                map,
                forbidMoving: this._forbidMoving,
                forbidRotating: this._forbidRotating,
                forbidZooming: this._forbidZooming,
                timeLimit,
            }),
            method: "POST",
        });

        const jsonResponse = { token: 'temp' }; //await response.json();
        if (Object.keys(jsonResponse).includes('token')) {
            let settings = [];
            if (this._forbidMoving) settings.push('No moving');
            if (this._forbidZooming) settings.push('No zooming');
            if (this._forbidRotating) settings.push('No panning');
            const settingsString = settings.join(', ') ?? 'Moving, zooming, panning allowed';

            return {
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'New GeoGuessr challenge! :tada:',
                            emoji: true,
                        },
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Generated by:*\n${user}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Map:*\n${this._mapId}`,
                            },
                        ],
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Round time limit:*\n${timeLimit === 0 ? 'None' : timeLimit + ' seconds'}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Settings:*\n${settingsString}`,
                            },
                        ]
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `<https://www.geoguessr.com/challenge/${jsonResponse.token}|Play now!>`,
                        }
                    }
                ]
            };
        } else {
            throw new Error(`Got invalid response back when generating GeoGuessr challenge: ${JSON.stringify(jsonResponse)}`)
        }
    }
}
