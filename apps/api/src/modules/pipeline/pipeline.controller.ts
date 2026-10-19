import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import {
  AcceptQuoteDto,
  BoardQueryDto,
  CreateQuoteDto,
  ListDealsDto,
  CreateDealActivityDto,
  CreateDealDto,
  CreatePipelineDto,
  CreateStageDto,
  LoseDealDto,
  MoveDealDto,
  ReopenDealDto,
  SaveDealItemsDto,
  TransitionQueryDto,
  UpdateDealDto,
  UpdatePipelineDto,
  UpdateStageDto,
  WinDealDto,
} from "./pipeline.dto";
import { PipelineService, type Actor } from "./pipeline.service";

const actor = (user: JwtPayload): Actor => ({ id: user.sub, role: user.role });

@ApiTags("pipeline")
@ApiBearerAuth()
@Controller()
export class PipelineController {
  constructor(private readonly service: PipelineService) {}
  @Get("pipeline/owners") owners(): Promise<unknown> {
    return this.service.listOwners();
  }
  @Get("pipelines") pipelines() {
    return this.service.listPipelines();
  }
  @Post("pipelines") createPipeline(@Body() dto: CreatePipelineDto) {
    return this.service.createPipeline(dto);
  }
  @Patch("pipelines/:id") updatePipeline(
    @Param("id") id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.service.updatePipeline(id, dto);
  }
  @Delete("pipelines/:id") deletePipeline(@Param("id") id: string) {
    return this.service.deletePipeline(id);
  }
  @Post("pipelines/:id/stages") createStage(
    @Param("id") id: string,
    @Body() dto: CreateStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createStage(id, dto, actor(user));
  }
  @Patch("stages/:id") updateStage(
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStage(id, dto, actor(user));
  }
  @Delete("stages/:id") deleteStage(@Param("id") id: string) {
    return this.service.deleteStage(id);
  }
  @Get("deals/board") board(@Query() query: BoardQueryDto): Promise<unknown> {
    return query.column && query.pipelineId
      ? this.service.boardColumn(query.pipelineId, query.column, query.page)
      : this.service.board(query.pipelineId);
  }
  @Get("deals") listDeals(@Query() query: ListDealsDto): Promise<unknown> {
    return this.service.listDeals(query);
  }
  @Post("deals") createDeal(
    @Body() dto: CreateDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.createDeal(dto, user.sub);
  }
  @Put("deals/:id/items") saveItems(
    @Param("id") id: string,
    @Body() dto: SaveDealItemsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.saveItems(id, dto.items, actor(user));
  }
  @Post("deals/:id/quotes") createQuote(
    @Param("id") id: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.createQuote(id, dto, actor(user));
  }
  @Post("deals/:id/quotes/:quoteId/accept") @HttpCode(200) acceptQuote(
    @Param("id") id: string,
    @Param("quoteId") quoteId: string,
    @Body() dto: AcceptQuoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.acceptQuote(id, quoteId, dto, actor(user));
  }
  @Get("deals/:id/transition") previewTransition(
    @Param("id") id: string,
    @Query() query: TransitionQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.previewTransition(id, query.to, actor(user));
  }
  @Get("deals/:id/history") history(@Param("id") id: string) {
    return this.service.history(id);
  }
  @Post("deals/:id/activities") createActivity(
    @Param("id") id: string,
    @Body() dto: CreateDealActivityDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.createActivity(id, dto, user.sub);
  }
  @Patch("deals/:id/activities/:activityId/complete") completeActivity(
    @Param("id") id: string,
    @Param("activityId") activityId: string,
  ): Promise<unknown> {
    return this.service.completeActivity(id, activityId);
  }
  @Post("deals/:id/win") @HttpCode(200) win(
    @Param("id") id: string,
    @Body() dto: WinDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.transition(id, "WON", dto, actor(user));
  }
  @Post("deals/:id/lose") @HttpCode(200) lose(
    @Param("id") id: string,
    @Body() dto: LoseDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.transition(id, "LOST", dto, actor(user));
  }
  @Post("deals/:id/reopen") @HttpCode(200) reopen(
    @Param("id") id: string,
    @Body() dto: ReopenDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.transition(id, "REOPEN", dto, actor(user));
  }
  @Get("deals/:id") getDeal(@Param("id") id: string): Promise<unknown> {
    return this.service.findDeal(id);
  }
  @Patch("deals/:id/move") moveDeal(
    @Param("id") id: string,
    @Body() dto: MoveDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    const { stageId, ...input } = dto;
    return this.service.transition(id, stageId, input, actor(user));
  }
  @Patch("deals/:id") updateDeal(
    @Param("id") id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.updateDeal(id, dto, actor(user));
  }
  @Delete("deals/:id") deleteDeal(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteDeal(id, actor(user));
  }
}
