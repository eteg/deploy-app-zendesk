export const isZipFile = (filePath: string) => {
    const extension = filePath.substring(filePath.lastIndexOf("."))

    return extension === ".zip"
}