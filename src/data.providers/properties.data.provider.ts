import {window} from 'vscode';
import * as fs from 'fs';
import * as props from 'properties';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * Properties data provider for .properties, .ini and .env data files.
 */
export class PropertiesDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.env', '.ini', '.properties'];
  
  private logger: Logger = new Logger('properties.data.provider:', config.logLevel);

  /**
   * Creates new properties data provider for .env, .ini, and .properties config files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public async getData(dataUrl: string, parseOptions: any, loadData: Function): Promise<void> {
    let data: any = [];
    // TODO: add mime types later for remote http data loading
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension
    try {
      // read and parse properties file type data
      let content: string = String(await fileUtils.readDataFile(dataUrl, 'utf8'));
      data = props.parse(content, this.getDataParseOptions(dataFileType));
    }
    catch (error) {
      this.logger.logMessage(LogLevel.Error, `getData(): Error parsing '${dataUrl}' \n\t Error:`, error.message);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \n\t Error: ${error.message}`);
    }
    loadData(jsonUtils.convertJsonData(data));
  }

  /**
   * Gets data provider parse options for the specified data file type.
   * @param dataFileType Data file type.
   */
  private getDataParseOptions(dataFileType: string): Function {
    let dataParseOptions: any = null; // default
    switch (dataFileType) {
      case '.env':
        dataParseOptions = {sections: true, comments: ['#']};
        break;
      case '.ini':
        // NOTE: some INI files consider # as a comment
        dataParseOptions = {sections: true, comments: [';', '#']};
        break;
      case '.properties':
        dataParseOptions = {sections: true};
        break;
    }
    return dataParseOptions;
  }

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return []; // none for properties data files
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    // TODO: auto-gen json schema ???
    return null; // none for properties data files
  }

  /**
   * Saves .properties data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    // check if data is from Properties Grid Data View
    if (fileData.length > 0 && fileData[0].hasOwnProperty('key') && fileData[0].hasOwnProperty('value')) {
      let propertiesString: string = '';
      const newLineRegExp: RegExp = new RegExp('\n', 'g');
      fileData = fileData.forEach(property => {
        // convert it to properties string
        let propertyLine:string =`${property['key']}=${property['value']}`;
        if (propertyLine.indexOf(`\n`) > 0) {
          // replace all new lines for multi-line property values with \ next line marker and \n
          propertyLine = propertyLine.replace(newLineRegExp, '\\\n');
        }
        propertiesString += `${propertyLine}\n`;
      });
      fileData = propertiesString;
    } else {
      // display not a properties collection warning
      fileData = '';
      window.showWarningMessage(`Data loaded in Preview is not a Properties collection. Use other data formats to Save this data.`);
    }

    if ( fileData.length > 0) {
      // TODO: change this to async later
      fs.writeFile(filePath, fileData, (error) => showData(error));
    }
  } // end of saveData()

}
