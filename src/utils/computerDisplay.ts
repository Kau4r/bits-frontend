export interface ComputerDisplaySource {
    Computer_ID: number;
    Name: string;
    Display_Name?: string;
    Display_Number?: number;
    Created_At?: string;
}

export interface NumberedComputer<T extends ComputerDisplaySource> {
    computer: T;
    displayName: string;
    displayNumber: number;
    originalName: string;
    wasRenumbered: boolean;
}

const extractPcNumber = (name = ''): number | null => {
    const pcMatch = name.match(/\b(?:PC|COMPUTER)\s*[-#:]*\s*(\d+)\b/i);
    if (pcMatch) return Number(pcMatch[1]);

    const trailingNumber = name.match(/(\d+)\s*$/);
    return trailingNumber ? Number(trailingNumber[1]) : null;
};

const createdAtValue = (value?: string) => {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
};

export const sortComputersForDisplay = <T extends ComputerDisplaySource>(computers: T[]): T[] => {
    return [...computers].sort((a, b) => {
        const aDisplayNumber = a.Display_Number ?? extractPcNumber(a.Name);
        const bDisplayNumber = b.Display_Number ?? extractPcNumber(b.Name);

        if (aDisplayNumber !== null && bDisplayNumber !== null && aDisplayNumber !== bDisplayNumber) {
            return aDisplayNumber - bDisplayNumber;
        }

        if (aDisplayNumber !== null && bDisplayNumber === null) return -1;
        if (aDisplayNumber === null && bDisplayNumber !== null) return 1;

        const createdAtCompare = createdAtValue(a.Created_At) - createdAtValue(b.Created_At);
        if (createdAtCompare !== 0) return createdAtCompare;

        return a.Computer_ID - b.Computer_ID;
    });
};

export const getNumberedComputers = <T extends ComputerDisplaySource>(computers: T[]): NumberedComputer<T>[] => {
    return sortComputersForDisplay(computers).map((computer, index) => {
        const displayNumber = computer.Display_Number ?? index + 1;
        const displayName = computer.Display_Name || `PC ${displayNumber}`;

        return {
            computer,
            displayName,
            displayNumber,
            originalName: computer.Name,
            wasRenumbered: computer.Name.trim().toUpperCase() !== displayName.toUpperCase(),
        };
    });
};

export const getComputerDisplayName = (computer: ComputerDisplaySource, fallbackIndex?: number): string => {
    return computer.Display_Name || `PC ${computer.Display_Number ?? fallbackIndex ?? computer.Computer_ID}`;
};

export const getNextComputerName = (computers: ComputerDisplaySource[]): string => {
    const usedNumbers = new Set<number>();

    for (const computer of computers) {
        const number = computer.Display_Number ?? extractPcNumber(computer.Name);
        if (number && number > 0) {
            usedNumbers.add(number);
        }
    }

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
        nextNumber += 1;
    }

    return `PC ${nextNumber}`;
};
