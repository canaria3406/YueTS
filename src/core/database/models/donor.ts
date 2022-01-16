import sequelize from "sequelize";
import { ImageType } from "../../image/ImageType.js";
import { DatabaseManager } from "../DatabaseManager.js";

export class Donor extends sequelize.Model {
    id: number;
    guild: string;
    channel: string;
    user: string;
    type: number;
    amount: number;
    /**
     * Get contribution ratio according donate type
     * @param {string} type donate type
     * @returns {number} contribution ratio
     */
    static contributionRatio(type: ImageType): number {
        switch (type) {
            case ImageType.PIC:
                return 1;
            case ImageType.PIC:
                return 3;
            case ImageType.WTFPIC:
                return 1;
        }
    }
    /**
     * Get contribution amount user need to increase
     * @returns {number} contribution amount user need to increase
     */
    gainContribution(): number {
        return this.amount * Donor.contributionRatio(this.type);
    }
}

export function init() {
    Donor.init(
        {
            guild: {
                type: sequelize.DataTypes.STRING,
                allowNull: false,
            },
            channel: {
                type: sequelize.DataTypes.STRING,
                allowNull: false,
            },
            user: {
                type: sequelize.DataTypes.STRING,
                allowNull: false,
            },
            type: {
                type: sequelize.DataTypes.TINYINT,
                allowNull: false,
            },
            amount: {
                type: sequelize.DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
        },
        { sequelize: DatabaseManager.sequelize }
    );
}
