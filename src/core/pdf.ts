﻿namespace MakerJs.exporter {

    /**
     * Injects drawing into a PDFKit document.
     * 
     * @param modelToExport Model object to export.
     * @param options Export options object.
     * @returns String of PDF file contents.
     */
    export function toPDF(doc: PDFKit.PDFDocument, modelToExport: IModel, options?: IPDFRenderOptions) {
        if (!modelToExport) return;

        //fixup options
        var opts: IPDFRenderOptions = {
            origin: [0, 0],
            stroke: "#000",
        };

        extendObject(opts, options);

        //try to get the unit system from the itemToExport
        var scale = 1;
        var exportUnits = opts.units || modelToExport.units;
        if (exportUnits) {
            //convert to inch
            scale = units.conversionScale(exportUnits, unitType.Inch);
        } else {
            //assume pixels, convert to inch
            scale = 1 / 100;
        }

        //from inch to PDF PPI
        scale *= 72;

        //TODO scale each element without a whole clone
        var scaledModel = model.scale(cloneObject(modelToExport), scale);

        var size = measure.modelExtents(scaledModel);

        var left = -size.low[0];
        var offset: IPoint = [left, size.high[1]];

        offset = point.add(offset, options.origin);

        model.findChains(
            scaledModel,
            function (chains: IChain[], loose: IWalkPath[], layer: string) {

                function single(walkedPath: IWalkPath) {
                    var pathData = pathToSVGPathData(walkedPath.pathContext, walkedPath.offset, offset, 1);
                    doc.path(pathData).stroke(opts.stroke);
                }

                chains.map(function (chain: IChain) {
                    if (chain.links.length > 1) {
                        var pathData = chainToSVGPathData(chain, offset, 1);
                        doc.path(pathData).stroke(opts.stroke);

                    } else {
                        var walkedPath = chain.links[0].walkedPath;
                        if (walkedPath.pathContext.type === pathType.Circle) {

                            var fixedPath: IPath;
                            path.moveTemporary([walkedPath.pathContext], [walkedPath.offset], function () {
                                fixedPath = path.mirror(walkedPath.pathContext, false, true);
                            });
                            path.moveRelative(fixedPath, offset);

                            //TODO use only chainToSVGPathData instead of circle, so that we can use fill

                            doc.circle(fixedPath.origin[0], fixedPath.origin[1], (<IPathCircle>walkedPath.pathContext).radius).stroke(opts.stroke);

                        } else {
                            single(walkedPath);
                        }
                    }
                });

                loose.map(single);

            },
            { byLayers: false }
        );
    }

    /**
     * PDF rendering options.
     */
    export interface IPDFRenderOptions extends IExportOptions {

        /**
         * Rendered reference origin. 
         */
        origin?: IPoint;

        /**
         * SVG color of the rendered paths.
         */
        stroke?: string;
    }
}