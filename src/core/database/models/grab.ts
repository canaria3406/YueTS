import sequelize from "sequelize";
import { DatabaseManager } from "../DatabaseManager.js";

export class Grab extends sequelize.Model {
    id: number;
    guild: string;
    channel: string;
    time: Date;
}

export function init() {
    Grab.init(
        {
            guild: {
                type: sequelize.DataTypes.STRING,
                allowNull: false,
            },
            channel: {
                type: sequelize.DataTypes.STRING,
                allowNull: false,
            },
            time: {
                type: sequelize.DataTypes.DATE,
                defaultValue: sequelize.DataTypes.NOW,
                allowNull: false,
            },
        },
        { sequelize: DatabaseManager.sequelize }
    );
}
