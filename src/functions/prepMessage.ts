

// take a string. if it is less than or equal to 64 bytes return it.
// otherwise return an array of strings where each string is upto 64 bytes of the string

export const prepMessage = (message: string) : string[] => {
    const maxLineLength = 64;
    // option 1 may break characters which are more than a single byte
    // option 2 may exceed the max line length limit when any character is more than a single byte
    const option1 = ( ) => {
        const bytes = new TextEncoder().encode(message);

        const bytesArray = [];

        for (let i = 0; i < bytes.length; i += maxLineLength) {
            bytesArray.push(bytes.slice(i, i + maxLineLength));
        }

        return bytesArray.map(byteArray => new TextDecoder().decode(byteArray));
    }

    const option2 = ( ) => {
        return message.match(`.{1,${maxLineLength}}`) || [];
    }

    return option1();
}