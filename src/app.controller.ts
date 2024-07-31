import {
  Controller,
  Post,
  Body,
  Ip,
  Req,
  Res,
  Get,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';

@Controller('payment')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('getCardTokenSecure')
  async getCardTokenSecure(
    @Body('creditCardNo') creditCardNo: string,
    @Body('expireDateMonth') expireDateMonth: string,
    @Body('expireDateYear') expireDateYear: string,
    @Body('cvcNo') cvcNo: string,
  ): Promise<any> {
    try {
      const result = await this.appService.getCardTokenSecure(
        creditCardNo,
        expireDateMonth,
        expireDateYear,
        cvcNo,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('register-card')
  async registerCard(
    @Body('msisdn') msisdn: string,
    @Body('cardToken') cardToken: string,
    @Body('alias') alias: string,
    @Body('isDefault') isDefault: boolean,
    @Body('eulaId') eulaId: string,
    @Body('threeDSessionId') threeDSessionId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Ip() clientIPAddress: string,
  ) {
    try {
      const result = await this.appService.registerCard(
        msisdn,
        cardToken,
        alias,
        isDefault,
        eulaId,
        threeDSessionId,
      );
      if (result.responseHeader && result.responseHeader.responseCode === '0') {
        res.status(200).json(result);
      } else {
        res.status(400).json(result.responseHeader);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Post('getThreeDSession')
  async getThreeDSession(
    @Body('msisdn') msisdn: string,
    @Body('cardId') cardId: string,
    @Body('cardToken') cardToken: string,
    @Body('amount') amount: string,
    @Body('installmentCount') installmentCount: number,
    @Body('target') target: string,
    @Body('transactionType') transactionType: string,
  ): Promise<any> {
    return this.appService.getThreeDSession(
      msisdn,
      target,
      transactionType,
      installmentCount,
      amount,
      cardId,
      cardToken
    );
  }

  @Post('getThreeDSessionResult')
  async getThreeDSessionResult(
    @Body('msisdn') msisdn: string,
    @Body('threeDSessionId') threeDSessionId: string,
    @Body('referenceNumber') referenceNumber: string,
  ): Promise<any> {
    return this.appService.getThreeDSessionResult(
      msisdn,
      threeDSessionId,
      referenceNumber,
    );
  }

  @Post('query-cards')
  async queryCards(
    @Body('msisdn') msisdn: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientIPAddress = req.ip || req.connection.remoteAddress;

    try {
      const result = await this.appService.queryCards(msisdn,clientIPAddress);
      if (result.responseHeader && result.responseHeader.responseCode === '0') {
        res.status(200).json(result);
      } else {
        res.status(400).json(result.responseHeader);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Post('terms-of-service')
  async getTermsOfServiceContent(@Res() res: Response) {
    try {
      const result = await this.appService.getTermsOfServiceContent();
      if (result) {
        res.json(result);
      } else {
        res.status(500).json({ message: 'Failed to retrieve terms of service content' });
      }
    } catch (error) {
      res.status(500).json({ message: `Error occurred: ${error.message}` });
    }
  }

  @Post('update-card')
  async updateCard(
    @Body('alias') alias: string,
    @Body('cardId') cardId: string,
    @Body('eulaId') eulaId: string,
    @Body('msisdn') msisdn: string,
    @Res() res: Response,
    @Body('isDefault') isDefault?: boolean,
    @Body('otpValidationId') otpValidationId?: string,
    @Body('otp') otp?: string,
    @Body('threeDSessionId') threeDSessionId?: string,
  ) {
    try {
      const result = await this.appService.updateCard(
        alias,
        cardId,
        eulaId,
        msisdn,
        isDefault,
        otpValidationId,
        otp,
        threeDSessionId
      );
      if (result.responseHeader && result.responseHeader.responseCode === '0') {
        res.status(200).json(result);
      } else {
        res.status(400).json(result.responseHeader);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  @Post('provision')
  async provisionAll(
    @Body('cardId') cardId: string,
    @Body('merchantCode') merchantCode: string,
    @Body('msisdn') msisdn: string,
    @Body('referenceNumber') referenceNumber: string,
    @Body('amount') amount: string,
    @Res() res: Response,
    @Body('paymentType') paymentType: string,
    @Body('acquirerBankCode') acquirerBankCode?: string,
    @Body('threeDSessionId') threeDSessionId?: string,
  ) {
    try {
      const result = await this.appService.provision(
        cardId,
        merchantCode,
        msisdn,
        referenceNumber,
        amount,
        paymentType,
        acquirerBankCode,
        threeDSessionId,
      );
      if (result.responseHeader && result.responseHeader.responseCode === '0') {
        res.status(200).json(result);
      } else {
        res.status(400).json(result.responseHeader);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Post('cardAdd')
  async cardAdd(
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip,
    @Body('cardNo') cardNo: string,
    @Body('expireDateMonth') expireDateMonth: string,
    @Body('expireDateYear') expireDateYear: string,
    @Body('cvc') cvc: string,
    @Body('msisdn') msisdn: string,
    @Body('isDefault') isDefault: boolean,
    @Body('alias') alias: string,
  ) { 
    console.log('ip', ip);
    const clientIPAddress = ip;

    const result = await this.appService.cardAdd(cardNo, expireDateMonth, expireDateYear, cvc, msisdn, isDefault, clientIPAddress, alias);
    if (result.responseHeader && result.responseHeader.responseCode === '0') {
      res.status(200).json(result);
    } else {
      res.status(400).json(result.responseHeader);
    }
  }

  @Post('getThreeDSessionWithCardAdd')
  async getThreeDSessionWithCardAdd(
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip,
    @Body('cardNo') cardNo: string,
    @Body('expireDateMonth') expireDateMonth: string,
    @Body('expireDateYear') expireDateYear: string,
    @Body('cvc') cvc: string,
    @Body('msisdn') msisdn: string,
    @Body('isDefault') isDefault: boolean,
    @Body('alias') alias: string,
  ) {
    console.log('ip', ip);
    const clientIPAddress = ip;

    try {
      const htmlResponse = await this.appService.getThreeDSessionWithCardAdd(cardNo, expireDateMonth, expireDateYear, cvc, msisdn, isDefault, clientIPAddress, alias);
      await res.type('html');
      await res.send(htmlResponse);
    } catch (error) {
      console.error('Error in getThreeDSessionWithCardAdd:', error);
      res.status(500).send({ message: error.message });
    }
  }

  @Post('threeDSessionCardAdd')
  async threeDSessionCardAdd(
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip,
    @Query('threeDSessionId') threeDSessionId: string,
    @Query('msisdn') msisdn: string,
    @Query('cardToken') cardToken: string,
    @Query('eulaId') eulaId: string,
    @Query('isDefault') isDefault: boolean,
    @Query('alias') alias: string,
  ) { 
    console.log('ip', ip);
    const clientIPAddress = ip;

    const result = await this.appService.threeDSessionCardAdd(threeDSessionId, msisdn, cardToken, eulaId, isDefault, alias, clientIPAddress);
    return result;
  }

  @Post('definedCardPayment')
  async definedCardPayment(
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip,
    @Body('msisdn') msisdn: string,
    @Body('amount') amount: string,
  ) { 
    console.log('ip', ip);
    const clientIPAddress = ip;

    const result = await this.appService.definedCardPayment(msisdn, amount);
    return res.send(result);
  }
}