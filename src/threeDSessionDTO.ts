export class ThreeDSessionDTO {
    threeDSessionId?: string;
    msisdn?: string;
    cardToken?: string;
    eulaId?: string;
    isDefault?: boolean;
    clientIPAddress?: string;
    alias?: string;


    constructor(threeDSessionId: string, msisdn: string, cardToken: string, eulaId: string, isDefault: boolean, clientIPAddress: string, alias?: string) {
      this.threeDSessionId = threeDSessionId;
      this.msisdn = msisdn;
      this.cardToken = cardToken;
      this.eulaId = eulaId;
      this.isDefault = isDefault;
      this.clientIPAddress = clientIPAddress;
      this.alias = alias;
    }
  }
  
  