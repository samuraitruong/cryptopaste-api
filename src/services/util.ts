export class Util{
    public static unix() {
        const now = new Date();
        const unix = Date.UTC(now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(), 
            now.getUTCHours(), 
            now.getUTCMinutes(), 
            now.getUTCSeconds(), 
            now.getUTCMilliseconds());
        return Math.floor(unix/1000);
    }
}