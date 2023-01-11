import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../category/category.entity';
import { CategoryService } from '../category/category.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction } from './transaction.entity';
import { BankService } from '../bank/bank.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private categoryService: CategoryService,
    private bankService: BankService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    try {
      const categories: Category[] = [];

      for await (const id of createTransactionDto.categoriesIds) {
        const category = await this.categoryService.findOne(id);
        if (!category) {
          throw new NotFoundException('Category not found');
        }
        categories.push(category);
      }
  
      const bank = await this.bankService.findOne(createTransactionDto.bankId);
  
      if (!bank) {
        throw new NotFoundException('Bank not found');
      }
  
      const transaction = await this.transactionRepository.save({
        ...createTransactionDto,
        categories,
        bank,
      });
  
      if (!transaction) {
        throw new InternalServerErrorException();
      }

      await this.bankService.update(bank.id, { balance: bank.balance + createTransactionDto.amount });

      return transaction;
    } catch (e) {
      console.log(e);
      return e;
    }
  }

  async findAll(): Promise<Transaction[]> {
    return await this.transactionRepository.find();
  }

  async remove(id: number): Promise<void>  {
    const transaction = await this.transactionRepository.findOne(id, { relations: ['bank'] });
    await this.transactionRepository.delete(id);
    await this.bankService.update(transaction.bank.id, { balance: transaction.bank.balance - transaction.amount });
  }
}