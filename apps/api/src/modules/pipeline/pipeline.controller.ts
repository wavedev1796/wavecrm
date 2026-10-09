import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import {
  ListDealsDto,
  CreateDealDto,
  CreatePipelineDto,
  CreateStageDto,
  MoveDealDto,
  UpdateDealDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from "./pipeline.dto";
import { PipelineService } from "./pipeline.service";

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
  ) {
    return this.service.createStage(id, dto);
  }
  @Patch("stages/:id") updateStage(
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.service.updateStage(id, dto);
  }
  @Delete("stages/:id") deleteStage(@Param("id") id: string) {
    return this.service.deleteStage(id);
  }
  @Get("deals/board") board(
    @Query("pipelineId") pipelineId?: string,
  ): Promise<unknown> {
    return this.service.board(pipelineId);
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
  @Get("deals/:id/history") history(@Param("id") id: string) {
    return this.service.history(id);
  }
  @Get("deals/:id") getDeal(@Param("id") id: string): Promise<unknown> {
    return this.service.findDeal(id);
  }
  @Patch("deals/:id/move") moveDeal(
    @Param("id") id: string,
    @Body() dto: MoveDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.moveDeal(id, dto.stageId, user.sub);
  }
  @Patch("deals/:id") updateDeal(
    @Param("id") id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.service.updateDeal(id, dto, user.sub);
  }
  @Delete("deals/:id") deleteDeal(@Param("id") id: string) {
    return this.service.deleteDeal(id);
  }
}
