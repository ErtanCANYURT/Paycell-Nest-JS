import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, Observable, of } from 'rxjs';
import { response } from 'express';
import { ThreeDSessionDTO } from './threeDSessionDTO';

@Injectable()
export class AppService {
  private readonly configService: ConfigService;
  private readonly apiUrl =
    'https://tpay-test.turkcell.com.tr:443/tpay/provision/services/restful/getCardToken';
  private readonly applicationName = 'PAYCELLTEST';
  private readonly applicationPassword = 'PaycellTestPassword';
  private readonly secureCode = 'PAYCELL12345';
  private readonly eulaid = '17';
  private readonly merchantCode = '9998';
  private readonly referenceNumberPrefix = '001';
  private readonly logger = new Logger(AppService.name);
  private leadingZeros(number: number, length: number): string {
    return number.toString().padStart(length, '0');
  }

  constructor(
    configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.configService = configService;
    this.httpService = httpService;
  }

  generateTransactionDateTime(): string {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = this.leadingZeros(date.getMonth() + 1, 2);
    const day = this.leadingZeros(date.getDate(), 2);
    const hours = this.leadingZeros(date.getHours(), 2);
    const minutes = this.leadingZeros(date.getMinutes(), 2);
    const seconds = this.leadingZeros(date.getSeconds(), 2);
    const milliseconds = this.leadingZeros(date.getMilliseconds(), 3);

    return year + month + day + hours + minutes + seconds + milliseconds;
  }

  private generateTransactionId(): string {
    return (
      this.referenceNumberPrefix + this.generateTransactionDateTime().toString()
    );
  }

  private hashData(data: string): string {
    const sha256 = crypto.createHash('sha256');
    sha256.update(data);
    return sha256.digest('base64');
  }

  private createSecurityData(
    applicationPwd: string,
    applicationName: string,
  ): string {
    return this.hashData((applicationPwd + applicationName).toUpperCase());
  }

  private createHashData(
    applicationName: string,
    transactionId: string,
    transactionDateTime: string,
    secureCode: string,
    securityData: string,
  ): string {
    const data = (
      applicationName +
      transactionId +
      transactionDateTime +
      secureCode +
      securityData
    ).toUpperCase();
    return this.hashData(data);
  }

  private createResponseHashData(
    applicationName: string,
    transactionId: string,
    responseDateTime: string,
    responseCode: string,
    cardToken: string,
    secureCode: string,
    securityData: string,
  ): string {
    const data = (
      applicationName +
      transactionId +
      responseDateTime +
      responseCode +
      cardToken +
      secureCode +
      securityData
    ).toUpperCase();
    return this.hashData(data);
  }
  async getCardTokenSecure(
    creditCardNo: string,
    expireDateMonth: string,
    expireDateYear: string,
    cvcNo: string,
  ): Promise<any> {
    const applicationName = this.applicationName;
    const applicationPwd = this.applicationPassword;
    const secureCode = this.secureCode;
    const transactionId = this.generateTransactionId();
    const transactionDateTime = this.generateTransactionDateTime();

    const securityData = this.createSecurityData(
      applicationPwd,
      applicationName,
    );
    const hashData = this.createHashData(
      applicationName,
      transactionId,
      transactionDateTime,
      secureCode,
      securityData,
    );

    const requestBody = {
      header: {
        applicationName,
        transactionId,
        transactionDateTime,
      },
      creditCardNo: creditCardNo.toString(),
      expireDateMonth: expireDateMonth.toString(),
      expireDateYear: expireDateYear.toString(),
      cvcNo: cvcNo.toString(),
      hashData: hashData.toString(),
    };

    try {
      const response = await axios.post(
        'https://omccstb.turkcell.com.tr/paymentmanagement/rest/getCardTokenSecure',
        requestBody,
      );

      const responseBody = response.data;
      const responseSecurityData = this.createSecurityData(
        applicationPwd,
        applicationName,
      );
      const responseHashData = this.createResponseHashData(
        applicationName,
        responseBody.header.transactionId,
        responseBody.header.responseDateTime,
        responseBody.header.responseCode,
        responseBody.cardToken,
        secureCode,
        responseSecurityData,
      );

      if (responseBody.hashData !== responseHashData) {
        throw new Error('Invalid response hash data');
      }

      return responseBody;
    } catch (error) {
      this.logger.error(
        `Error in getCardTokenSecure: ${JSON.stringify(error.response?.data || error.message, null, 2)}`,
      );
      throw error;
    }
  }

  async queryCards(msisdn: string, clientIPAddress?: string): Promise<any> {
    const data = {
      msisdn,
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress,
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      },
    };

    this.logger.debug(
      `QueryCards REST request: ${JSON.stringify(data, null, 2)}`,
    );

    try {
      data.requestHeader.clientIPAddress = '10.252.187.82';
      const response = await axios.post(`${this.apiUrl}/getCards`, data);
      this.logger.debug(
        `QueryCards REST response: ${JSON.stringify(response.data, null, 2)}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`,
      );
      throw error;
    }
  }

  async registerCard(
    msisdn: string,
    cardToken: string,
    alias: string,
    isDefault: boolean,
    eulaId: string,
    clientIPAddress?: string,
    threeDSessionId?: string,
    
  ): Promise<any> {
    const data = {
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress,
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      },
      alias,
      cardToken,
      eulaId,
      msisdn,
      isDefault,
      threeDSessionId: threeDSessionId ? String(threeDSessionId) : undefined,
    };

    try {
      data.requestHeader.clientIPAddress =  '10.252.187.82';
      const response = await axios.post(`${this.apiUrl}/registerCard`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getThreeDSession(
    msisdn: string,
    target: string,
    transactionType: string,
    installmentCount?: number,
    amount?: string,
    cardId?: string,
    cardToken?: string,
    clientIPAddress?: string,
  ): Promise<any> {
    const data = {
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress,// Örneğin, gerçek istemci IP adresinizi buraya ekleyin. // Müşteri ip mi yok sa server ip mi?
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      },
      msisdn: msisdn,
      cardId: cardId,
      cardToken : cardToken,
      amount: amount,
      installmentCount: installmentCount,
      target: target,
      transactionType: transactionType,
      merchantCode: this.merchantCode,
    };

    try {
      data.requestHeader.clientIPAddress = '10.252.187.81';
      const response = await axios.post(
        `${this.apiUrl}/getThreeDSession`,
        data,
      );
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getThreeDSessionResult(
    msisdn: string,
    threeDSessionId: string,
    referenceNumber?: string,
  ): Promise<any> {
    const data = {
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress: '192.168.1.1',
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      },
      msisdn,
      referenceNumber,
      merchantCode: this.merchantCode,
      threeDSessionId,
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/getThreeDSessionResult`,
        data,
      );
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
  
  async getTermsOfServiceContent(): Promise<any> {
    const requestPayload = {
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress: '192.168.1.1',
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      }
    };
    try {
      const response = await axios.post(`${this.apiUrl}/getTermsOfServiceContent`, requestPayload);
      return response.data;
    }
    catch (error) {
      throw new Error(error.message);
    }
  }

  async updateCard(
    alias: string,
    cardId: string,
    eulaId: string,
    msisdn: string,
    isDefault?: boolean,
    otpValidationId?: string,
    otp?: string,
    threeDSessionId?: string,
  ): Promise<any> { 
    const requestPayload = {
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress: '10.252.187.81',
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      },
      alias,
      cardId,
      eulaId,
      isDefault,
      msisdn,
      otpValidationId,
      otp,
      threeDSessionId
    };
  
    try {
      const response = await axios.post(`${this.apiUrl}/updateCard`, requestPayload);
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async provision(
    cardId: string,
    merchantCode: string,
    msisdn: string,
    referenceNumber: string,
    amount: string,
    paymentType: string,
    currency: string,
    acquirerBankCode?: string,
    threeDSessionId?: string,

  ): Promise<any> {
    const requestPayload = {
      requestHeader: {
        applicationName: this.applicationName,
        applicationPwd: this.applicationPassword,
        clientIPAddress: '10.252.187.81',
        transactionDateTime: moment().format('YYYYMMDDHHmmssSSS'),
        transactionId:
          this.referenceNumberPrefix + moment().format('YYYYMMDDHHmmssSSS'),
      },
      cardId,
      merchantCode: this.merchantCode,
      msisdn,
      referenceNumber : '89333374401234567892',//Burası paycellden alınacak, deneme yapıldı başarılı sonuç alındı.
      amount,
      currency: "TRY",
      paymentType,
      acquirerBankCode,
      threeDSessionId: threeDSessionId || undefined,
    };

    try {
      const response = await axios.post(`${this.apiUrl}/provision`, requestPayload);
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async cardAdd(
    cardNo: string,
    expireDateMonth: string,
    expireDateYear: string,
    cvc: string,
    msisdn: string,
    isDefault: boolean,
    clientIPAddress: string,
    alias?: string,
  ): Promise<any> {
    const tokenResponse = await this.getCardTokenSecure(cardNo, expireDateMonth, expireDateYear, cvc);
    const cardToken = tokenResponse.cardToken;
    const eulaIdResponse = await this.getTermsOfServiceContent();
    const eulaId = eulaIdResponse.eulaId;
    console.log("Backend Payload:", {
      cardNo,
      expireDateMonth,
      expireDateYear,
      cvc,
      msisdn,
      isDefault,
      clientIPAddress,
      alias,
      cardToken,
      eulaId,
    });
    
    try {
      const registerCardResponse = await this.registerCard(msisdn, cardToken, alias, isDefault, eulaId, clientIPAddress, undefined);
      return registerCardResponse;
    } catch (error) {
      console.error("Error in cardAdd method:", error);
      throw new Error(error.message);
    }
  }

    private async redirectToBank(response: ThreeDSessionDTO): Promise<any> {
      const formData = new URLSearchParams();
      formData.append('threeDSessionId', response.threeDSessionId);
      formData.append('callbackurl', `${"http://localhost:3000/payment/threeDSessionCardAdd"}?threeDSessionId=${encodeURIComponent(response.threeDSessionId)}&msisdn=${encodeURIComponent(response.msisdn)}&cardToken=${encodeURIComponent(response.cardToken)}&eulaId=${encodeURIComponent(response.eulaId)}&isDefault=${encodeURIComponent(response.isDefault.toString())}&alias=${encodeURIComponent(response.alias)}`);
      formData.append('isPost3DResult', 'true');
    
      try {
        const result = await axios.post('https://omccstb.turkcell.com.tr/paymentmanagement/rest/threeDSecure', formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          responseType: 'text',
        });
    
        return await result.data;
      } catch (error) {
        console.error('Error in redirectToBank:', error);
        throw new Error(error.message);
      }
    }

    async getThreeDSessionWithCardAdd(
      cardNo: string,
      expireDateMonth: string,
      expireDateYear: string,
      cvc: string,
      msisdn: string,
      isDefault: boolean,
      clientIPAddress: string,
      alias?: string,
    ): Promise<any> {
      const tokenResponse = await this.getCardTokenSecure(cardNo, expireDateMonth, expireDateYear, cvc);
      const cardToken = tokenResponse.cardToken;
      const eulaIdResponse = await this.getTermsOfServiceContent();
      const eulaId = eulaIdResponse.eulaId;
  
      try {
        const response = await this.getThreeDSession(msisdn, "MERCHANT", "AUTH", undefined, '1', undefined, cardToken, undefined);
        const dto = new ThreeDSessionDTO(response.threeDSessionId, msisdn, cardToken, eulaId, isDefault, clientIPAddress, alias);

        return await this.redirectToBank(dto);
      } catch (error) {
        throw new Error(error.message);
      }
    }

    async threeDSessionCardAdd(
      threeDSessionId: string,
      msisdn: string,
      cardToken: string,
      eulaId: string,
      isDefault: boolean,
      alias: string,
      clientIPAddress: string,
    ): Promise<any> {
      const threeDSessionIdResult = await this.getThreeDSessionResult(msisdn, threeDSessionId);
      const threeDResultCode = threeDSessionIdResult.threeDOperationResult.threeDResult;

      try{

      if (threeDResultCode === '0') {
        const registerCardResponse = await this.registerCard(msisdn, cardToken, alias, isDefault, eulaId, clientIPAddress, threeDSessionId);
    }
      } 
    catch (error) {
      throw new Error(error.message);
    }
  }

  async definedCardPayment (
    msisdn: string,
    amount: string,
  ): Promise<any> {
    const cardList = await this.queryCards(msisdn);
    const eulaIdResponse = await this.getTermsOfServiceContent();
    const eulaId = eulaIdResponse.eulaId;

    let defaultCardId ="";
    for(let i=0; i<cardList.cardList.length; i++){
      if(cardList.cardList[i].isDefault == true){
        defaultCardId = cardList.cardList[i].cardId;
      }
    }

    if(cardList.eulaId == eulaId){
      const requestPayload = await this.provision(defaultCardId, this.merchantCode, msisdn, undefined, amount, "SALE", undefined, undefined);
      return requestPayload;
    }
  }

  async definedCardPaymentWithThreeD(
    msisdn: string,
    amount: string,
    clientIPAddress: string,
  ): Promise<any> {
    const cardList = await this.queryCards(msisdn, clientIPAddress);
    const eulaIdResponse = await this.getTermsOfServiceContent();
    const eulaId = eulaIdResponse.eulaId;

    let defaultCardId ="";
    for(let i=0; i<cardList.cardList.length; i++){
      if(cardList.cardList[i].isDefault == true){
        defaultCardId = cardList.cardList[i].cardId;
      }
    }
    try
    {
    const threeDSession = await this.getThreeDSession(msisdn, "MERCHANT", "AUTH", undefined, amount, cardList.card[0].cardId, undefined, clientIPAddress);
    const dto = new ThreeDSessionDTO(threeDSession.threeDSessionId, msisdn, defaultCardId, eulaId, true, clientIPAddress, cardList.alias);
    return await this.redirectToBank(dto);
    }
    catch (error) {
      throw new Error(error.message);
  }
} 
}